// src/modules/whatsapp/types/whatsapp.types.ts

/**
 * Tipos generales de la aplicación WhatsApp
 * Estos enums deben coincidir con los definidos en las entidades de la base de datos
 */

export enum InstanceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

// Interfaces básicas que se usan en múltiples lugares
export interface WhatsAppConfig {
  instanceName: string;
  webhookUrl?: string;
  qrCodeTimeout?: number;
  messageRetries?: number;
}

export interface MessageMetadata {
  messageId?: string;
  timestamp?: Date;
  retryCount?: number;
}

// DTOs internos
export interface SendMessageRequest {
  to: string;
  text: string;
  instanceId: string;
}

export interface MediaMessageRequest extends SendMessageRequest {
  mediaUrl: string;
  caption?: string;
  mimeType: string;
}