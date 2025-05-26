// Orquestador principal
// src/modules/ai/services/ai-core.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { 
  AIProfile, 
  Conversation, 
  Message,
  MessageDirection,
  AIResponseMode 
} from '../../../database/entities';

@Injectable()
export class AICoreService {
  private readonly logger = new Logger(AICoreService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(AIProfile)
    private aiProfileRepository: Repository<AIProfile>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Determinar si la IA debe responder este mensaje
   */
  async shouldRespond(
    message: string,
    conversationId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      // Obtener perfil de IA del tenant
      const aiProfile = await this.getOrCreateAIProfile(tenantId);

      // Si la IA está deshabilitada, no responder
      if (!aiProfile.enabled) {
        return false;
      }

      // Verificar modo de respuesta
      switch (aiProfile.responseMode) {
        case AIResponseMode.ALWAYS:
          return true;

        case AIResponseMode.BUSINESS_HOURS:
          return this.isWithinBusinessHours(aiProfile);

        case AIResponseMode.OUTSIDE_HOURS:
          return !this.isWithinBusinessHours(aiProfile);

        case AIResponseMode.KEYWORDS:
          return this.containsKeywords(message, aiProfile.keywords);

        case AIResponseMode.MANUAL:
          return false;

        default:
          return true;
      }
    } catch (error) {
      this.logger.error(`Error checking if should respond: ${error.message}`);
      return false;
    }
  }

  /**
   * Generar respuesta usando OpenAI
   */
  async generateResponse(
    message: string,
    conversationId: string,
    tenantId: string
  ): Promise<string | null> {
    try {
      // Obtener perfil de IA
      const aiProfile = await this.getOrCreateAIProfile(tenantId);

      // Verificar límites
      if (!await this.checkLimits(aiProfile)) {
        this.logger.warn(`Límites de IA excedidos para tenant ${tenantId}`);
        return null;
      }

      // Obtener contexto de conversación (últimos mensajes)
      const context = await this.getConversationContext(conversationId, aiProfile.settings.contextWindow || 5);

      // Construir el prompt del sistema
      const systemPrompt = this.buildSystemPrompt(aiProfile);

      // Construir mensajes para OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...context,
        { role: 'user', content: message }
      ];

      // Llamar a OpenAI
      const completion = await this.openai.chat.completions.create({
        model: aiProfile.model,
        messages,
        temperature: aiProfile.settings.temperature || 0.7,
        max_tokens: aiProfile.settings.maxTokens || 150,
      });

      const response = completion.choices[0]?.message?.content;

      if (response) {
        // Actualizar uso de tokens
        await this.updateUsage(aiProfile, completion.usage?.total_tokens || 0);

        // Aplicar delay si está configurado
        if (aiProfile.settings.responseDelay) {
          await this.delay(aiProfile.settings.responseDelay);
        }

        return response;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error generating AI response: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtener o crear perfil de IA para un tenant
   */
  private async getOrCreateAIProfile(tenantId: string): Promise<AIProfile> {
    let profile = await this.aiProfileRepository.findOne({
      where: { tenantId }
    });

    if (!profile) {
      // Crear perfil por defecto
      profile = this.aiProfileRepository.create({
        tenantId,
        enabled: false, // Deshabilitado por defecto
        systemPrompt: this.getDefaultSystemPrompt(),
        welcomeMessage: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        settings: {
          temperature: 0.7,
          maxTokens: 150,
          responseDelay: 1000,
          contextWindow: 5,
          language: 'es',
        },
        limits: {
          maxTokensPerDay: 10000,
          maxTokensPerMonth: 100000,
          maxConversationsPerDay: 100,
        },
        usage: {
          tokensToday: 0,
          tokensThisMonth: 0,
          conversationsToday: 0,
          lastResetDate: new Date().toISOString(),
        },
      });

      await this.aiProfileRepository.save(profile);
    }

    return profile;
  }

  /**
   * Construir prompt del sistema basado en el perfil
   */
  private buildSystemPrompt(profile: AIProfile): string {
    if (profile.systemPrompt) {
      return profile.systemPrompt;
    }

    // Prompt por defecto según personalidad
    const personalityPrompts = {
      professional: 'Eres un asistente profesional y formal. Responde de manera clara, concisa y educada. Usa un tono corporativo.',
      friendly: 'Eres un asistente amigable y cercano. Responde de manera cálida y conversacional, como un amigo ayudando a otro.',
      technical: 'Eres un asistente técnico experto. Proporciona respuestas detalladas y precisas, usando terminología técnica cuando sea apropiado.',
      sales: 'Eres un asistente de ventas persuasivo pero no agresivo. Ayuda a los clientes destacando beneficios y resolviendo objeciones.',
      custom: this.getDefaultSystemPrompt(),
    };

    let prompt = personalityPrompts[profile.personality] || personalityPrompts.friendly;

    // Agregar configuraciones adicionales
    if (profile.settings.language) {
      prompt += ` Responde siempre en ${profile.settings.language}.`;
    }

    if (profile.settings.industry) {
      prompt += ` Eres especialista en la industria de ${profile.settings.industry}.`;
    }

    if (profile.blockedPhrases?.length > 0) {
      prompt += ` Nunca uses estas frases o palabras: ${profile.blockedPhrases.join(', ')}.`;
    }

    return prompt;
  }

  /**
   * Obtener contexto de conversación
   */
  private async getConversationContext(
    conversationId: string, 
    limit: number
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit * 2, // Tomar más para incluir respuestas
    });

    return messages
      .reverse()
      .map(msg => ({
        role: msg.direction === MessageDirection.INBOUND ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));
  }

  /**
   * Verificar si estamos en horario laboral
   */
  private isWithinBusinessHours(profile: AIProfile): boolean {
    const now = new Date();
    const timezone = profile.businessHours.timezone || 'America/Lima';
    
    // Obtener día de la semana
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    
    const todayHours = profile.businessHours[currentDay];
    if (!todayHours) return false;

    // Parsear horas (formato HH:MM)
    const [startHour, startMin] = todayHours.start.split(':').map(Number);
    const [endHour, endMin] = todayHours.end.split(':').map(Number);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Verificar si el mensaje contiene palabras clave
   */
  private containsKeywords(message: string, keywords: string[]): boolean {
    if (!keywords || keywords.length === 0) return false;
    
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * Verificar límites de uso
   */
  private async checkLimits(profile: AIProfile): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = profile.usage.lastResetDate?.split('T')[0];

    // Resetear contadores si es un nuevo día
    if (lastReset !== today) {
      profile.usage.tokensToday = 0;
      profile.usage.conversationsToday = 0;
      profile.usage.lastResetDate = new Date().toISOString();
      
      // Resetear mensual si es día 1
      if (new Date().getDate() === 1) {
        profile.usage.tokensThisMonth = 0;
      }
    }

    // Verificar límites diarios
    if (profile.limits.maxTokensPerDay && profile.usage.tokensToday >= profile.limits.maxTokensPerDay) {
      return false;
    }

    // Verificar límites mensuales
    if (profile.limits.maxTokensPerMonth && profile.usage.tokensThisMonth >= profile.limits.maxTokensPerMonth) {
      return false;
    }

    return true;
  }

  /**
   * Actualizar uso de tokens
   */
  private async updateUsage(profile: AIProfile, tokensUsed: number): Promise<void> {
    profile.usage.tokensToday = (profile.usage.tokensToday || 0) + tokensUsed;
    profile.usage.tokensThisMonth = (profile.usage.tokensThisMonth || 0) + tokensUsed;
    
    await this.aiProfileRepository.save(profile);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Prompt por defecto
   */
  private getDefaultSystemPrompt(): string {
    return `Eres un asistente virtual profesional y amigable. Tu objetivo es ayudar a los usuarios de manera eficiente y cortés. 
Responde de forma clara y concisa, pero mantén un tono conversacional. 
Si no entiendes algo, pide aclaraciones educadamente. 
Siempre intenta ser útil y proporcionar valor en tus respuestas.`;
  }
}