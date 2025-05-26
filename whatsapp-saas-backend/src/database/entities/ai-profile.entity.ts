// src/database/entities/ai-profile.entity.ts
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

export enum AIModel {
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo-preview',
}

export enum AIPersonality {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  TECHNICAL = 'technical',
  SALES = 'sales',
  CUSTOM = 'custom',
}

export enum AIResponseMode {
  ALWAYS = 'always',           // Siempre responde
  BUSINESS_HOURS = 'business_hours', // Solo en horario laboral
  OUTSIDE_HOURS = 'outside_hours',   // Solo fuera de horario
  KEYWORDS = 'keywords',       // Solo si detecta palabras clave
  MANUAL = 'manual',          // Solo activación manual
}

@Entity('ai_profiles')
export class AIProfile extends BaseEntity {
  @Column()
  tenantId: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ default: true })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: AIModel,
    default: AIModel.GPT_35_TURBO,
  })
  model: AIModel;

  @Column({
    type: 'enum',
    enum: AIPersonality,
    default: AIPersonality.FRIENDLY,
  })
  personality: AIPersonality;

  @Column({
    type: 'enum',
    enum: AIResponseMode,
    default: AIResponseMode.ALWAYS,
  })
  responseMode: AIResponseMode;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ type: 'jsonb', default: {} })
  businessHours: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
    timezone?: string;
  };

  @Column({ type: 'jsonb', default: [] })
  keywords: string[];

  @Column({ type: 'jsonb', default: {} })
  settings: {
    temperature?: number;        // 0-1, creatividad
    maxTokens?: number;         // Límite de tokens por respuesta
    responseDelay?: number;     // Delay en ms antes de responder
    contextWindow?: number;     // Número de mensajes anteriores a incluir
    language?: string;          // Idioma por defecto
    industry?: string;          // Industria/vertical
    tone?: string;             // Tono de comunicación
  };

  @Column({ type: 'jsonb', default: {} })
  limits: {
    maxTokensPerDay?: number;
    maxTokensPerMonth?: number;
    maxConversationsPerDay?: number;
  };

  @Column({ type: 'jsonb', default: {} })
  usage: {
    tokensToday?: number;
    tokensThisMonth?: number;
    conversationsToday?: number;
    lastResetDate?: string;
  };

  @Column({ default: true })
  autoLearn: boolean;

  @Column({ type: 'jsonb', default: [] })
  blockedPhrases: string[];

  @Column({ type: 'jsonb', default: {} })
  customResponses: Record<string, string>;
}