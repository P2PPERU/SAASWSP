// src/modules/ai/dto/ai-config.dto.ts
import { 
  IsBoolean, 
  IsEnum, 
  IsObject, 
  IsOptional, 
  IsString, 
  IsNumber, 
  ValidateNested,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIModel, AIPersonality, AIResponseMode } from '../../../database/entities/ai-profile.entity';

// DTO para horarios de negocio
class BusinessHoursDto {
  @ApiPropertyOptional({ example: { start: '09:00', end: '18:00' } })
  @IsOptional()
  @IsObject()
  monday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tuesday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  wednesday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  thursday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  friday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  saturday?: { start: string; end: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sunday?: { start: string; end: string };

  @ApiPropertyOptional({ example: 'America/Lima' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// DTO para configuraciones avanzadas
class AISettingsDto {
  @ApiPropertyOptional({ example: 0.7, description: 'Creatividad de respuestas (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({ example: 150, description: 'Máximo de tokens por respuesta' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  maxTokens?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Delay en ms antes de responder' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  responseDelay?: number;

  @ApiPropertyOptional({ example: 5, description: 'Mensajes de contexto a incluir' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  contextWindow?: number;

  @ApiPropertyOptional({ example: 'es', description: 'Idioma de respuestas' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'ecommerce', description: 'Industria/vertical' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'friendly', description: 'Tono de comunicación' })
  @IsOptional()
  @IsString()
  tone?: string;
}

// DTO para límites
class AILimitsDto {
  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTokensPerDay?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTokensPerMonth?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxConversationsPerDay?: number;
}

// DTO principal para actualizar configuración
export class UpdateAIConfigDto {
  @ApiPropertyOptional({ description: 'Activar o desactivar IA' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: AIModel, description: 'Modelo de IA a usar' })
  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;

  @ApiPropertyOptional({ enum: AIPersonality, description: 'Personalidad del asistente' })
  @IsOptional()
  @IsEnum(AIPersonality)
  personality?: AIPersonality;

  @ApiPropertyOptional({ enum: AIResponseMode, description: 'Cuándo debe responder la IA' })
  @IsOptional()
  @IsEnum(AIResponseMode)
  responseMode?: AIResponseMode;

  @ApiPropertyOptional({ description: 'Prompt del sistema', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Mensaje de bienvenida', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Horarios de atención' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  @ApiPropertyOptional({ description: 'Palabras clave para activar IA', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Configuraciones avanzadas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AISettingsDto)
  settings?: AISettingsDto;

  @ApiPropertyOptional({ description: 'Límites de uso' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AILimitsDto)
  limits?: AILimitsDto;

  @ApiPropertyOptional({ description: 'Auto-aprendizaje habilitado' })
  @IsOptional()
  @IsBoolean()
  autoLearn?: boolean;

  @ApiPropertyOptional({ description: 'Frases bloqueadas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedPhrases?: string[];

  @ApiPropertyOptional({ 
    description: 'Respuestas personalizadas',
    type: 'object',
    additionalProperties: { type: 'string' }
  })
  @IsOptional()
  @IsObject()
  customResponses?: Record<string, string>;
}

// DTO para toggle simple
export class ToggleAIDto {
  @ApiProperty({ description: 'Estado deseado de la IA' })
  @IsBoolean()
  enabled: boolean;
}

// DTO para respuesta de configuración
export class AIConfigResponseDto {
  id: string;
  tenantId: string;
  enabled: boolean;
  model: AIModel;
  personality: AIPersonality;
  responseMode: AIResponseMode;
  systemPrompt: string;
  welcomeMessage: string;
  businessHours: any;
  keywords: string[];
  settings: AISettingsDto;
  limits: AILimitsDto;
  usage: {
    tokensToday: number;
    tokensThisMonth: number;
    conversationsToday: number;
    lastResetDate: string;
  };
  autoLearn: boolean;
  blockedPhrases: string[];
  customResponses: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// DTO para estadísticas
export class AIStatsResponseDto {
  @ApiProperty({ description: 'Periodo de las estadísticas' })
  period: {
    start: string;
    end: string;
    days: number;
  };

  @ApiProperty({ description: 'Métricas de mensajes' })
  messages: {
    total: number;
    handledByAI: number;
    handledByHuman: number;
    aiResponseRate: number;
  };

  @ApiProperty({ description: 'Métricas de rendimiento' })
  performance: {
    averageResponseTime: number;
    successRate: number;
    tokensUsed: number;
    estimatedCost: number;
  };

  @ApiProperty({ description: 'Top intenciones detectadas' })
  topIntents: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Métricas de valor' })
  value: {
    timeSaved: number; // en minutos
    conversationsAutomated: number;
    customerSatisfaction: number; // 0-100
  };

  @ApiProperty({ description: 'Uso actual vs límites' })
  usage: {
    daily: {
      tokens: { used: number; limit: number; percentage: number };
      conversations: { used: number; limit: number; percentage: number };
    };
    monthly: {
      tokens: { used: number; limit: number; percentage: number };
      estimatedCost: number;
    };
  };
}

// DTO para test de prompt
export class TestPromptDto {
  @ApiProperty({ description: 'Mensaje de prueba', example: 'Hola, ¿cuáles son sus horarios?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ description: 'Contexto adicional de prueba' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  context?: string[];
}

// DTO para respuesta de test
export class TestPromptResponseDto {
  @ApiProperty({ description: 'Respuesta generada por la IA' })
  response: string;

  @ApiProperty({ description: 'Información del procesamiento' })
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    temperature: number;
  };

  @ApiProperty({ description: 'Prompt usado (para debugging)' })
  debugInfo?: {
    systemPrompt: string;
    formattedMessages: any[];
  };
}

// DTO para plantilla de industria
export class IndustryTemplateDto {
  @ApiProperty({ description: 'Nombre de la industria', example: 'ecommerce' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Configuración recomendada' })
  config: {
    systemPrompt: string;
    welcomeMessage: string;
    personality: AIPersonality;
    settings: AISettingsDto;
    commonResponses: Record<string, string>;
  };
}