// src/modules/whatsapp/types/evolution-v2.types.ts

/**
 * Tipos específicos para Evolution API v2
 */

// Respuesta al crear instancia
export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  qrcode: {
    code: string;
    base64: string;
  };
}

// Estado de conexión
export interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
    profileName?: string;
    profilePictureUrl?: string;
    profileStatus?: string;
    isBusinessAccount?: boolean;
  };
}

// Estructura de webhook v2
export interface EvolutionWebhookV2 {
  event: string;
  instance: string;
  data: any;
  server_url: string;
  apikey: string;
  date_time: string;
}

// Eventos de webhook
export enum WebhookEvents {
  // Conexión
  CONNECTION_UPDATE = 'connection.update',
  
  // QR Code
  QRCODE_UPDATED = 'qrcode.updated',
  
  // Mensajes
  MESSAGES_SET = 'messages.set',
  MESSAGES_UPSERT = 'messages.upsert',
  MESSAGES_UPDATE = 'messages.update',
  MESSAGES_DELETE = 'messages.delete',
  
  // Envío
  SEND_MESSAGE = 'send.message',
  
  // Presencia
  PRESENCE_UPDATE = 'presence.update',
  
  // Grupos
  GROUPS_UPSERT = 'groups.upsert',
  GROUPS_UPDATE = 'groups.update',
  GROUP_PARTICIPANTS_UPDATE = 'group-participants.update',
  
  // Otros
  APPLICATION_STARTUP = 'application.startup',
  NEW_JWT_TOKEN = 'new.jwt.token',
}

// Estructura de mensaje v2
export interface MessageUpsertV2 {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message: {
    // Texto simple
    conversation?: string;
    
    // Texto extendido
    extendedTextMessage?: {
      text: string;
      contextInfo?: any;
    };
    
    // Imagen
    imageMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
      fileLength?: string;
      height?: number;
      width?: number;
    };
    
    // Audio
    audioMessage?: {
      url?: string;
      mimetype?: string;
      fileLength?: string;
      seconds?: number;
      ptt?: boolean;
    };
    
    // Video
    videoMessage?: {
      url?: string;
      mimetype?: string;
      caption?: string;
      fileLength?: string;
      seconds?: number;
    };
    
    // Documento
    documentMessage?: {
      url?: string;
      mimetype?: string;
      title?: string;
      fileLength?: string;
      fileName?: string;
    };
    
    // Ubicación
    locationMessage?: {
      degreesLatitude: number;
      degreesLongitude: number;
      name?: string;
      address?: string;
    };
    
    // Contacto
    contactMessage?: {
      displayName: string;
      vcard: string;
    };
    
    // Sticker
    stickerMessage?: {
      url?: string;
      mimetype?: string;
      fileLength?: string;
    };
    
    // Reacción
    reactionMessage?: {
      key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
      };
      text: string;
    };
  };
  messageTimestamp: string;
  status?: number;
  participant?: string;
}

// Actualización de estado de mensaje
export interface MessageUpdateV2 {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  update: {
    status: 'ERROR' | 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';
  };
}

// Respuesta al enviar mensaje
export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: string;
  status: string;
}

// Configuración de webhook
export interface WebhookConfig {
  webhook: {
    enabled: boolean;
    url: string;
    webhook_by_events: boolean;
    webhook_base64: boolean;
    events: string[];
  };
}

// Respuesta de lista de instancias
export interface FetchInstancesResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey?: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
    connectionStatus: 'open' | 'close' | 'connecting';
  };
}[]