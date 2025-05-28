// src/utils/constants.ts

// ===== API ENDPOINTS =====
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  
  // WhatsApp
  WHATSAPP: {
    INSTANCES: '/whatsapp/instances',
    INSTANCE: (id: string) => `/whatsapp/instances/${id}`,
    CONNECT: (id: string) => `/whatsapp/instances/${id}/connect`,
    CONNECTION_STATUS: (id: string) => `/whatsapp/instances/${id}/connection-status`,
    DISCONNECT: (id: string) => `/whatsapp/instances/${id}/disconnect`,
    SEND_MESSAGE: (id: string) => `/whatsapp/instances/${id}/messages/send`,
    SEND_BULK: (id: string) => `/whatsapp/instances/${id}/messages/bulk`,
    SCHEDULE_MESSAGE: (id: string) => `/whatsapp/instances/${id}/messages/schedule`,
    CONVERSATIONS: (id: string) => `/whatsapp/instances/${id}/conversations`,
    MESSAGES: (conversationId: string) => `/whatsapp/conversations/${conversationId}/messages`,
    QUEUE_STATS: '/whatsapp/queue/stats',
    RATE_LIMIT: '/whatsapp/rate-limit/usage',
    RETRY_FAILED: '/whatsapp/queue/retry-failed',
  },
  
  // AI
  AI: {
    CONFIG: '/ai/config',
    TOGGLE: '/ai/toggle',
    STATS: '/ai/stats',
    TEST: '/ai/test',
    TEMPLATES: '/ai/templates',
    CUSTOM_RESPONSES: '/ai/custom-responses',
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    USAGE_PATTERNS: '/analytics/usage-patterns',
    REPORT: '/analytics/report',
    SUMMARY: '/analytics/summary',
  },
  
  // Tenant
  TENANT: {
    INFO: '/tenant',
    SETTINGS: '/tenant/settings',
    USAGE: '/tenant/usage',
    USERS: '/tenant/users',
    DASHBOARD: '/tenant/dashboard',
  },
} as const;

// ===== RUTAS DE LA APLICACIÓN =====
export const ROUTES = {
  // Públicas
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  ONBOARDING: '/onboarding',
  
  // WhatsApp
  WHATSAPP: {
    INSTANCES: '/whatsapp/instances',
    INSTANCE_DETAIL: (id: string) => `/whatsapp/${id}`,
    INSTANCE_SETTINGS: (id: string) => `/whatsapp/${id}/settings`,
  },
  
  // Inbox
  INBOX: '/inbox',
  
  // AI
  AI: '/ai',
  
  // Analytics
  ANALYTICS: '/analytics',
  
  // Campañas
  CAMPAIGNS: '/campaigns',
  
  // Configuración
  SETTINGS: '/settings',
} as const;

// ===== CONFIGURACIÓN DE QUERY KEYS =====
export const QUERY_KEYS = {
  // Auth
  AUTH: {
    ME: ['auth', 'me'],
  },
  
  // WhatsApp
  WHATSAPP: {
    INSTANCES: ['whatsapp', 'instances'],
    INSTANCE: (id: string) => ['whatsapp', 'instance', id],
    CONNECTION_STATUS: (id: string) => ['whatsapp', 'connection-status', id],
    CONVERSATIONS: (id: string) => ['whatsapp', 'conversations', id],
    MESSAGES: (conversationId: string) => ['whatsapp', 'messages', conversationId],
    QUEUE_STATS: ['whatsapp', 'queue-stats'],
    RATE_LIMIT: ['whatsapp', 'rate-limit'],
  },
  
  // AI
  AI: {
    CONFIG: ['ai', 'config'],
    STATS: ['ai', 'stats'],
    TEMPLATES: ['ai', 'templates'],
  },
  
  // Analytics
  ANALYTICS: {
    DASHBOARD: ['analytics', 'dashboard'],
    USAGE_PATTERNS: ['analytics', 'usage-patterns'],
    SUMMARY: ['analytics', 'summary'],
  },
  
  // Tenant
  TENANT: {
    INFO: ['tenant', 'info'],
    USAGE: ['tenant', 'usage'],
    DASHBOARD: ['tenant', 'dashboard'],
  },
} as const;

// ===== CONFIGURACIÓN DE MENSAJES =====
export const MESSAGE_LIMITS = {
  MAX_LENGTH: 4096, // WhatsApp limit
  BULK_MAX_RECIPIENTS: 100,
  DELAY_BETWEEN_MESSAGES: 1000, // ms
  MAX_MEDIA_SIZE: 16 * 1024 * 1024, // 16MB
} as const;

// ===== CONFIGURACIÓN DE POLLING =====
export const POLLING_INTERVALS = {
  CONNECTION_STATUS: 5000, // 5 segundos
  QUEUE_STATS: 10000, // 10 segundos
  INSTANCES: 30000, // 30 segundos
  CONVERSATIONS: 15000, // 15 segundos
  RATE_LIMIT: 60000, // 1 minuto
} as const;

// ===== ESTADOS DE INSTANCIA =====
export const INSTANCE_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
} as const;

// ===== ESTADOS DE MENSAJE =====
export const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// ===== TIPOS DE MENSAJE =====
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  DOCUMENT: 'document',
  LOCATION: 'location',
} as const;

// ===== CONFIGURACIÓN DE RATE LIMITS =====
export const RATE_LIMITS = {
  BASIC: {
    MESSAGES_PER_MINUTE: 20,
    MESSAGES_PER_HOUR: 500,
    MESSAGES_PER_DAY: 5000,
    MESSAGES_PER_MONTH: 50000,
  },
  PRO: {
    MESSAGES_PER_MINUTE: 60,
    MESSAGES_PER_HOUR: 2000,
    MESSAGES_PER_DAY: 20000,
    MESSAGES_PER_MONTH: 200000,
  },
  ENTERPRISE: {
    MESSAGES_PER_MINUTE: 200,
    MESSAGES_PER_HOUR: 10000,
    MESSAGES_PER_DAY: 100000,
    MESSAGES_PER_MONTH: 1000000,
  },
} as const;

// ===== CONFIGURACIÓN DE TEMAS =====
export const THEME = {
  COLORS: {
    PRIMARY: '#8B5CF6', // Purple
    SECONDARY: '#06B6D4', // Cyan
    SUCCESS: '#10B981', // Green
    WARNING: '#F59E0B', // Yellow
    ERROR: '#EF4444', // Red
    WHATSAPP: '#25D366', // WhatsApp Green
    AI: '#8B5CF6', // Purple for AI
  },
  GRADIENTS: {
    PRIMARY: 'from-purple-500 to-pink-500',
    WHATSAPP: 'from-green-500 to-teal-500',
    AI: 'from-purple-500 to-indigo-500',
  },
} as const;

// ===== CONFIGURACIÓN DE ANIMACIONES =====
export const ANIMATIONS = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
  },
} as const;

// ===== CONFIGURACIÓN DE TOAST =====
export const TOAST_CONFIG = {
  DURATION: {
    SHORT: 2000,
    NORMAL: 4000,
    LONG: 6000,
  },
  POSITION: 'top-right',
} as const;

// ===== CONFIGURACIÓN DE VALIDACIÓN =====
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 6,
    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    ERROR_MESSAGE: 'La contraseña debe tener al menos 6 caracteres, una mayúscula y un número',
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    REGEX: /^\+?[1-9]\d{1,14}$/,
    ERROR_MESSAGE: 'Número de teléfono inválido',
  },
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ERROR_MESSAGE: 'Email inválido',
  },
  INSTANCE_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z0-9\s\-_]+$/,
    ERROR_MESSAGE: 'Solo letras, números, espacios, guiones y guiones bajos',
  },
} as const;

// ===== CONFIGURACIÓN DE ARCHIVOS =====
export const FILE_CONFIG = {
  MAX_SIZE: 16 * 1024 * 1024, // 16MB
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
    VIDEO: ['video/mp4', 'video/avi', 'video/mkv', 'video/mov'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
} as const;

// ===== CONFIGURACIÓN DE PAGINACIÓN =====
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MESSAGES_PAGE_SIZE: 50,
  CONVERSATIONS_PAGE_SIZE: 20,
} as const;

// ===== CONFIGURACIÓN DE BÚSQUEDA =====
export const SEARCH = {
  DEBOUNCE_DELAY: 300, // ms
  MIN_SEARCH_LENGTH: 2,
  MAX_RESULTS: 50,
} as const;

// ===== CONFIGURACIÓN DE TIEMPO =====
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// ===== CONFIGURACIÓN DE LOCALSTORAGE =====
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  SELECTED_INSTANCE: 'selectedInstance',
  CONVERSATION_FILTERS: 'conversationFilters',
} as const;

// ===== MENSAJES DE ERROR COMUNES =====
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'No estás autorizado. Inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos.',
  RATE_LIMIT_EXCEEDED: 'Has excedido el límite de solicitudes.',
  INSTANCE_NOT_CONNECTED: 'La instancia de WhatsApp no está conectada.',
  MESSAGE_TOO_LONG: `El mensaje es demasiado largo. Máximo ${MESSAGE_LIMITS.MAX_LENGTH} caracteres.`,
  INVALID_PHONE_NUMBER: 'Número de teléfono inválido.',
  FILE_TOO_LARGE: `El archivo es demasiado grande. Máximo ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB.`,
} as const;

// ===== MENSAJES DE ÉXITO =====
export const SUCCESS_MESSAGES = {
  LOGIN: '¡Bienvenido de vuelta!',
  REGISTER: '¡Cuenta creada exitosamente!',
  INSTANCE_CREATED: 'Instancia creada correctamente',
  INSTANCE_CONNECTED: '¡WhatsApp conectado exitosamente!',
  MESSAGE_SENT: 'Mensaje enviado correctamente',
  BULK_MESSAGES_QUEUED: 'Mensajes masivos agregados a la cola',
  SETTINGS_SAVED: 'Configuración guardada correctamente',
  PASSWORD_CHANGED: 'Contraseña actualizada correctamente',
} as const;

// ===== CONFIGURACIÓN DE FEATURES =====
export const FEATURES = {
  AI_RESPONSES: true,
  BULK_MESSAGING: true,
  SCHEDULED_MESSAGES: true,
  ANALYTICS: true,
  WEBHOOKS: true,
  RATE_LIMITING: true,
  MULTI_TENANCY: true,
} as const;

// ===== CONFIGURACIÓN DE DEBUG =====
export const DEBUG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_LEVEL: 'info',
  SHOW_QUERY_LOGS: process.env.NODE_ENV === 'development',
} as const;