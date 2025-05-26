// src/modules/ai/services/ai-config.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { 
  AIProfile, 
  AIModel, 
  AIPersonality,
  AIResponseMode,  // <-- AGREGADO
  Message,
  MessageDirection,
  Conversation
} from '../../../database/entities';
import { AICoreService } from './ai-core.service';
import {
  UpdateAIConfigDto,
  AIConfigResponseDto,
  AIStatsResponseDto,
  TestPromptDto,
  TestPromptResponseDto,
  IndustryTemplateDto,
} from '../dto/ai-config.dto';

@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(AIProfile)
    private aiProfileRepository: Repository<AIProfile>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private configService: ConfigService,
    private aiCoreService: AICoreService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  /**
   * Obtener configuración actual
   */
  async getConfig(tenantId: string): Promise<AIConfigResponseDto> {
    let profile = await this.aiProfileRepository.findOne({
      where: { tenantId },
      relations: ['tenant'],
    });

    if (!profile) {
      // Crear perfil por defecto si no existe
      profile = await this.createDefaultProfile(tenantId);
    }

    return this.mapToResponseDto(profile);
  }

  /**
   * Actualizar configuración
   */
  async updateConfig(
    tenantId: string, 
    updateDto: UpdateAIConfigDto
  ): Promise<AIConfigResponseDto> {
    let profile = await this.aiProfileRepository.findOne({
      where: { tenantId }
    });

    if (!profile) {
      profile = await this.createDefaultProfile(tenantId);
    }

    // Actualizar campos
    Object.assign(profile, updateDto);

    // Validar configuración
    this.validateConfig(profile);

    // Guardar cambios
    const updatedProfile = await this.aiProfileRepository.save(profile);
    
    this.logger.log(`AI config updated for tenant ${tenantId}`);

    return this.mapToResponseDto(updatedProfile);
  }

  /**
   * Toggle rápido de IA
   */
  async toggleAI(tenantId: string, enabled: boolean): Promise<AIProfile> {
    let profile = await this.aiProfileRepository.findOne({
      where: { tenantId }
    });

    if (!profile) {
      profile = await this.createDefaultProfile(tenantId);
    }

    profile.enabled = enabled;
    
    const updated = await this.aiProfileRepository.save(profile);
    
    this.logger.log(`AI ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Obtener estadísticas de uso
   */
  async getStats(
    tenantId: string, 
    period: 'today' | 'week' | 'month'
  ): Promise<AIStatsResponseDto> {
    const profile = await this.getConfig(tenantId);
    const { startDate, endDate, days } = this.getPeriodDates(period);

    // Obtener mensajes del periodo
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    // Calcular métricas
    const totalMessages = messages.length;
    const aiMessages = messages.filter(m => m.aiContext?.generatedByAI === true);
    const handledByAI = aiMessages.length;
    const handledByHuman = totalMessages - handledByAI;
    const aiResponseRate = totalMessages > 0 ? (handledByAI / totalMessages) * 100 : 0;

    // Calcular tiempo promedio de respuesta (simulado por ahora)
    const averageResponseTime = 1.5; // segundos

    // Calcular tokens usados
    const tokensUsed = profile.usage.tokensToday || 0;
    const estimatedCost = this.calculateCost(tokensUsed, profile.model);

    // Analizar intenciones (placeholder - implementaremos después)
    const topIntents = [
      { intent: 'QUESTION_PRODUCT', count: Math.floor(handledByAI * 0.4), percentage: 40 },
      { intent: 'QUESTION_PRICE', count: Math.floor(handledByAI * 0.3), percentage: 30 },
      { intent: 'GREETING', count: Math.floor(handledByAI * 0.2), percentage: 20 },
      { intent: 'SUPPORT', count: Math.floor(handledByAI * 0.1), percentage: 10 },
    ];

    // Calcular valor generado
    const avgHandlingTime = 2; // minutos por conversación manual
    const timeSaved = handledByAI * avgHandlingTime;
    const conversationsAutomated = await this.countAutomatedConversations(tenantId, startDate, endDate);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      messages: {
        total: totalMessages,
        handledByAI,
        handledByHuman,
        aiResponseRate,
      },
      performance: {
        averageResponseTime,
        successRate: 95, // Placeholder
        tokensUsed,
        estimatedCost,
      },
      topIntents,
      value: {
        timeSaved,
        conversationsAutomated,
        customerSatisfaction: 92, // Placeholder
      },
      usage: {
        daily: {
          tokens: {
            used: profile.usage.tokensToday || 0,
            limit: profile.limits.maxTokensPerDay || 10000,
            percentage: ((profile.usage.tokensToday || 0) / (profile.limits.maxTokensPerDay || 10000)) * 100,
          },
          conversations: {
            used: profile.usage.conversationsToday || 0,
            limit: profile.limits.maxConversationsPerDay || 100,
            percentage: ((profile.usage.conversationsToday || 0) / (profile.limits.maxConversationsPerDay || 100)) * 100,
          },
        },
        monthly: {
          tokens: {
            used: profile.usage.tokensThisMonth || 0,
            limit: profile.limits.maxTokensPerMonth || 100000,
            percentage: ((profile.usage.tokensThisMonth || 0) / (profile.limits.maxTokensPerMonth || 100000)) * 100,
          },
          estimatedCost: this.calculateCost(profile.usage.tokensThisMonth || 0, profile.model),
        },
      },
    };
  }

  /**
   * Probar configuración actual
   */
  async testPrompt(
    tenantId: string, 
    testDto: TestPromptDto
  ): Promise<TestPromptResponseDto> {
    const profile = await this.getConfig(tenantId);
    
    if (!profile.enabled) {
      throw new BadRequestException('La IA está desactivada');
    }

    if (!this.openai) {
      throw new BadRequestException('OpenAI no está configurado');
    }

    const startTime = Date.now();

    try {
      // Construir mensajes de contexto
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { 
          role: 'system', 
          content: profile.systemPrompt || this.getDefaultSystemPrompt() 
        }
      ];

      // Agregar contexto si se proporciona
      if (testDto.context && testDto.context.length > 0) {
        testDto.context.forEach((msg, index) => {
          messages.push({
            role: index % 2 === 0 ? 'user' : 'assistant',
            content: msg
          });
        });
      }

      // Agregar mensaje de prueba
      messages.push({ role: 'user', content: testDto.message });

      // Llamar a OpenAI
      const completion = await this.openai.chat.completions.create({
        model: profile.model,
        messages,
        temperature: profile.settings.temperature || 0.7,
        max_tokens: profile.settings.maxTokens || 150,
      });

      const processingTime = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || 'No se pudo generar respuesta';
      const tokensUsed = completion.usage?.total_tokens || 0;

      return {
        response,
        metadata: {
          model: profile.model,
          tokensUsed,
          processingTime,
          temperature: profile.settings.temperature || 0.7,
        },
        debugInfo: this.configService.get('NODE_ENV') === 'development' ? {
          systemPrompt: messages[0].content as string,
          formattedMessages: messages,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`Error testing prompt: ${error.message}`);
      throw new BadRequestException(`Error al probar IA: ${error.message}`);
    }
  }

  /**
   * Resetear contadores de uso
   */
  async resetUsage(tenantId: string): Promise<void> {
    const profile = await this.aiProfileRepository.findOne({
      where: { tenantId }
    });

    if (!profile) {
      throw new NotFoundException('Perfil de IA no encontrado');
    }

    profile.usage = {
      tokensToday: 0,
      tokensThisMonth: 0,
      conversationsToday: 0,
      lastResetDate: new Date().toISOString(),
    };

    await this.aiProfileRepository.save(profile);
    
    this.logger.log(`Usage reset for tenant ${tenantId}`);
  }

  /**
   * Obtener plantillas por industria
   */
  async getIndustryTemplates(): Promise<IndustryTemplateDto[]> {
    return [
      {
        industry: 'ecommerce',
        config: {
          systemPrompt: `Eres un asistente virtual de una tienda en línea. 
Tu objetivo es ayudar a los clientes con sus compras, responder preguntas sobre productos, 
procesar pedidos y brindar soporte post-venta. 
Sé amigable, profesional y orientado a las ventas sin ser agresivo.
Siempre verifica disponibilidad y precios antes de confirmar.`,
          welcomeMessage: '¡Hola! 👋 Bienvenido a nuestra tienda. ¿En qué puedo ayudarte hoy? Puedo mostrarte productos, verificar disponibilidad o ayudarte con tu pedido.',
          personality: AIPersonality.SALES,
          settings: {
            temperature: 0.7,
            maxTokens: 200,
            responseDelay: 1500,
            contextWindow: 10,
            language: 'es',
            industry: 'ecommerce',
            tone: 'professional-friendly',
          },
          commonResponses: {
            'precio': 'Para consultar precios actualizados, ¿podrías decirme qué producto te interesa?',
            'envío': 'Realizamos envíos a todo el país. El tiempo de entrega es de 2-5 días hábiles.',
            'pago': 'Aceptamos tarjetas de crédito/débito, transferencias y pagos contra entrega.',
          },
        },
      },
      {
        industry: 'restaurant',
        config: {
          systemPrompt: `Eres el asistente virtual de un restaurante. 
Ayudas con reservaciones, información del menú, horarios y pedidos para llevar.
Sé cálido y acogedor, como un buen anfitrión. 
Conoces bien el menú y puedes hacer recomendaciones.`,
          welcomeMessage: '¡Hola! 🍽️ Bienvenido a nuestro restaurante. ¿Te gustaría hacer una reservación, ver nuestro menú o realizar un pedido?',
          personality: AIPersonality.FRIENDLY,
          settings: {
            temperature: 0.8,
            maxTokens: 150,
            responseDelay: 1000,
            contextWindow: 5,
            language: 'es',
            industry: 'restaurant',
            tone: 'warm-welcoming',
          },
          commonResponses: {
            'menú': 'Te puedo enviar nuestro menú completo. ¿Prefieres ver platos principales, entradas o postres?',
            'reserva': '¡Por supuesto! ¿Para cuántas personas sería la reserva y qué fecha tienes en mente?',
            'horario': 'Estamos abiertos de Lunes a Sábado de 12:00 a 23:00, y Domingos de 12:00 a 17:00.',
          },
        },
      },
      {
        industry: 'healthcare',
        config: {
          systemPrompt: `Eres el asistente virtual de una clínica médica. 
Ayudas a agendar citas, proporcionar información general y orientar a los pacientes.
IMPORTANTE: No das consejos médicos ni diagnósticos. 
Siempre sugiere consultar con un profesional para temas de salud específicos.`,
          welcomeMessage: 'Hola, soy el asistente virtual de la clínica. ¿Necesitas agendar una cita o tienes alguna consulta sobre nuestros servicios?',
          personality: AIPersonality.PROFESSIONAL,
          settings: {
            temperature: 0.5,
            maxTokens: 150,
            responseDelay: 2000,
            contextWindow: 5,
            language: 'es',
            industry: 'healthcare',
            tone: 'professional-empathetic',
          },
          commonResponses: {
            'cita': 'Para agendar una cita, necesito saber: ¿Es primera vez o consulta de seguimiento? ¿Qué especialidad necesitas?',
            'urgencia': 'Para emergencias médicas, por favor llama al 911 o acude a urgencias inmediatamente.',
            'horarios': 'Atendemos de Lunes a Viernes de 8:00 a 20:00 y Sábados de 8:00 a 14:00.',
          },
        },
      },
      {
        industry: 'education',
        config: {
          systemPrompt: `Eres el asistente virtual de una institución educativa. 
Ayudas con información sobre cursos, inscripciones, horarios y requisitos.
Sé informativo, claro y motivador. 
Anima a los estudiantes potenciales a alcanzar sus metas educativas.`,
          welcomeMessage: '¡Hola! 📚 Bienvenido a nuestro centro educativo. ¿Te interesa conocer nuestros programas, proceso de admisión o tienes alguna consulta?',
          personality: AIPersonality.FRIENDLY,
          settings: {
            temperature: 0.7,
            maxTokens: 200,
            responseDelay: 1500,
            contextWindow: 8,
            language: 'es',
            industry: 'education',
            tone: 'encouraging-informative',
          },
          commonResponses: {
            'cursos': '¡Excelente! Ofrecemos varios programas. ¿Qué área te interesa: tecnología, negocios, idiomas o arte?',
            'requisitos': 'Los requisitos varían según el programa. En general necesitas: documento de identidad, certificado de estudios previos y llenar la solicitud.',
            'costos': 'Tenemos diferentes opciones de pago y becas disponibles. ¿Te gustaría recibir información detallada sobre inversión y financiamiento?',
          },
        },
      },
    ];
  }

  /**
   * Aplicar plantilla de industria
   */
  async applyIndustryTemplate(
    tenantId: string, 
    industry: string
  ): Promise<AIConfigResponseDto> {
    const templates = await this.getIndustryTemplates();
    const template = templates.find(t => t.industry === industry);

    if (!template) {
      throw new BadRequestException(`Plantilla para industria '${industry}' no encontrada`);
    }

    // Aplicar configuración de la plantilla
    const updateDto: UpdateAIConfigDto = {
      ...template.config,
      customResponses: template.config.commonResponses,
    };

    return this.updateConfig(tenantId, updateDto);
  }

  /**
   * Verificar salud del servicio
   */
  async checkHealth(tenantId: string) {
    const openaiConnected = !!this.openai;
    const profile = await this.aiProfileRepository.findOne({
      where: { tenantId }
    });

    let openaiStatus = { connected: false, model: 'unknown' };
    
    if (openaiConnected && this.openai) {
      try {
        // Hacer una llamada simple para verificar conexión
        const models = await this.openai.models.list();
        openaiStatus = {
          connected: true,
          model: profile?.model || 'gpt-3.5-turbo',
        };
      } catch (error) {
        this.logger.error(`OpenAI health check failed: ${error.message}`);
      }
    }

    return {
      status: openaiConnected && profile ? 'healthy' : 'unhealthy',
      openai: openaiStatus,
      database: {
        connected: true,
        profileExists: !!profile,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // === Métodos auxiliares privados ===

  private async createDefaultProfile(tenantId: string): Promise<AIProfile> {
    const profile = this.aiProfileRepository.create({
      tenantId,
      enabled: false,
      model: AIModel.GPT_35_TURBO,
      personality: AIPersonality.FRIENDLY,
      responseMode: AIResponseMode.ALWAYS,  // <-- CORREGIDO: Usar enum
      systemPrompt: this.getDefaultSystemPrompt(),
      welcomeMessage: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      businessHours: {},
      keywords: [],
      settings: {
        temperature: 0.7,
        maxTokens: 150,
        responseDelay: 1500,
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
      autoLearn: true,
      blockedPhrases: [],
      customResponses: {},
    });

    const savedProfile = await this.aiProfileRepository.save(profile);
    return savedProfile;  // <-- CORREGIDO: Retornar el objeto guardado
  }

  private mapToResponseDto(profile: AIProfile): AIConfigResponseDto {
    return {
      id: profile.id,
      tenantId: profile.tenantId,
      enabled: profile.enabled,
      model: profile.model,
      personality: profile.personality,
      responseMode: profile.responseMode,  // <-- CORREGIDO: Quitar "as any"
      systemPrompt: profile.systemPrompt,
      welcomeMessage: profile.welcomeMessage,
      businessHours: profile.businessHours,
      keywords: profile.keywords,
      settings: profile.settings as any,
      limits: profile.limits as any,
      usage: profile.usage as any,
      autoLearn: profile.autoLearn,
      blockedPhrases: profile.blockedPhrases,
      customResponses: profile.customResponses,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private validateConfig(profile: AIProfile): void {
    // Validar que los límites sean razonables
    if (profile.limits.maxTokensPerDay && profile.limits.maxTokensPerDay < 100) {
      throw new BadRequestException('El límite diario de tokens debe ser al menos 100');
    }

    // Validar temperatura
    if (profile.settings.temperature && 
        (profile.settings.temperature < 0 || profile.settings.temperature > 1)) {
      throw new BadRequestException('La temperatura debe estar entre 0 y 1');
    }

    // Validar maxTokens
    if (profile.settings.maxTokens && 
        (profile.settings.maxTokens < 50 || profile.settings.maxTokens > 500)) {
      throw new BadRequestException('maxTokens debe estar entre 50 y 500');
    }
  }

  private getPeriodDates(period: 'today' | 'week' | 'month') {
    const endDate = new Date();
    const startDate = new Date();
    let days = 1;

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        days = 7;
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        days = 30;
        break;
    }

    return { startDate, endDate, days };
  }

  private calculateCost(tokens: number, model: string): number {
    // Precios aproximados por 1K tokens
    const pricing = {
      'gpt-3.5-turbo': 0.002,
      'gpt-4': 0.03,
      'gpt-4-turbo-preview': 0.01,
    };

    const pricePerToken = (pricing[model] || pricing['gpt-3.5-turbo']) / 1000;
    return Math.round(tokens * pricePerToken * 100) / 100; // Redondear a 2 decimales
  }

  private async countAutomatedConversations(
    tenantId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    const result = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .leftJoin('conversation.messages', 'message')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('message.aiContext IS NOT NULL')
      .andWhere(`message.aiContext->>'generatedByAI' = 'true'`)
      .select('COUNT(DISTINCT conversation.id)', 'count')
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  private getDefaultSystemPrompt(): string {
    return `Eres un asistente virtual profesional y amigable. 
Tu objetivo es ayudar a los usuarios de manera eficiente y cortés. 
Responde de forma clara y concisa, pero mantén un tono conversacional. 
Si no entiendes algo, pide aclaraciones educadamente. 
Siempre intenta ser útil y proporcionar valor en tus respuestas.`;
  }
}