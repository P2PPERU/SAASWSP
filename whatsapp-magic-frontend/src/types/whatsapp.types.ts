// src/types/whatsapp.types.ts

// Enums que coinciden con el backend
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

// Interfaces
export interface WhatsAppInstance {
  id: string;
  tenantId: string;
  name: string;
  instanceKey: string;
  apiKey?: string; // <-- NUEVO: API Key única de la instancia
  phoneNumber?: string;
  status: InstanceStatus;
  qrCode?: string;
  settings?: Record<string, any>;
  lastConnectionAt?: Date | string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  instanceId: string;
  contactNumber: string;
  contactName: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt?: Date | string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  direction: MessageDirection;
  status: MessageStatus;
  media?: {
    mimetype?: string;
    url?: string;
    fileName?: string;
    seconds?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  aiContext?: {
    generatedByAI?: boolean;
    model?: string;
    timestamp?: string;
    originalMessage?: string;
    responseToMessageId?: string;
    apiKeyUsed?: string; // <-- NUEVO: Para debugging
  };
  createdAt: string;
  updatedAt?: string;
}

// DTOs
export interface CreateInstanceDto {
  name: string;
  settings?: Record<string, any>;
}

export interface UpdateInstanceDto {
  name?: string;
  settings?: Record<string, any>;
}

export interface SendMessageDto {
  to: string;
  text: string;
}

export interface BulkMessageDto {
  recipients: string[];
  text: string;
  delayBetweenMessages?: number;
}

export interface ScheduleMessageDto {
  to: string;
  text: string;
  sendAt: string;
}

// Response types
export interface ConnectionStatusResponse {
  instanceId: string;
  instanceKey: string;
  name: string;
  status: InstanceStatus;
  connected: boolean;
  connecting: boolean;
  phoneNumber?: string;
  profilePictureUrl?: string;
  lastConnectionAt?: Date | string;
  qrCode?: string;
  hasApiKey?: boolean; // <-- NUEVO: Indicador de API Key
  evolutionStatus?: any;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  total: number;
}

export interface RateLimitUsage {
  usage: {
    minute: number;
    hour: number;
    day: number;
    month: number;
  };
  limits: {
    minute: number;
    hour: number;
    day: number;
    month: number;
  };
  percentages: {
    minute: number;
    hour: number;
    day: number;
    month: number;
  };
}