// src/utils/formatters.ts
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ===== FORMATEO DE FECHAS =====

/**
 * Formatea una fecha para mostrar en conversaciones
 * Hoy: "14:30"
 * Ayer: "Ayer"  
 * Más antiguo: "23/05/2024"
 */
export function formatMessageDate(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(parsedDate)) {
    return format(parsedDate, 'HH:mm');
  }
  
  if (isYesterday(parsedDate)) {
    return 'Ayer';
  }
  
  return format(parsedDate, 'dd/MM/yyyy');
}

/**
 * Formatea fecha completa para tooltips o detalles
 */
export function formatFullDate(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

/**
 * Formatea fecha relativa (hace 5 minutos, hace 2 horas)
 */
export function formatRelativeDate(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(parsedDate, { 
    addSuffix: true, 
    locale: es 
  });
}

/**
 * Formatea fecha para la última conexión
 */
export function formatLastConnection(date: string | Date | null): string {
  if (!date) return 'Nunca';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(parsedDate)) {
    return `Hoy a las ${format(parsedDate, 'HH:mm')}`;
  }
  
  if (isYesterday(parsedDate)) {
    return `Ayer a las ${format(parsedDate, 'HH:mm')}`;
  }
  
  return format(parsedDate, "dd/MM/yyyy 'a las' HH:mm");
}

// ===== FORMATEO DE NÚMEROS =====

/**
 * Formatea números grandes (1K, 1M, etc.)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  
  return num.toString();
}

/**
 * Formatea números con separadores de miles
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES').format(num);
}

/**
 * Formatea porcentajes
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ===== FORMATEO DE TELÉFONOS =====

/**
 * Formatea número de teléfono para mostrar
 * +51999123456 -> +51 999 123 456
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Limpiar el número
  const cleaned = phone.replace(/\D/g, '');
  
  // Si tiene código de país (más de 10 dígitos)
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, -10);
    const number = cleaned.slice(-10);
    const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    return `+${countryCode} ${formatted}`;
  }
  
  // Número nacional
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  return phone;
}

/**
 * Normaliza número de teléfono para envío
 * Remueve espacios, guiones, etc.
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Valida si un número de teléfono es válido
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = normalizePhoneNumber(phone);
  // Entre 10 y 15 dígitos
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// ===== FORMATEO DE MENSAJES =====

/**
 * Trunca texto largo para preview
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Formatea el contenido del mensaje según su tipo
 */
export function formatMessageContent(content: string, type: string): string {
  switch (type) {
    case 'image':
      return '📷 Imagen';
    case 'audio':
      return '🎵 Audio';
    case 'video':
      return '🎥 Video';
    case 'document':
      return '📄 Documento';
    case 'location':
      return '📍 Ubicación';
    default:
      return content;
  }
}

/**
 * Detecta y formatea URLs en texto
 */
export function formatTextWithLinks(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');
}

// ===== FORMATEO DE ESTADO =====

/**
 * Formatea el estado de conexión
 */
export function formatConnectionStatus(status: string): {
  label: string;
  color: string;
  icon: string;
} {
  const statusMap = {
    connected: {
      label: 'Conectado',
      color: 'text-green-400',
      icon: '🟢'
    },
    connecting: {
      label: 'Conectando...',
      color: 'text-yellow-400',
      icon: '🟡'
    },
    disconnected: {
      label: 'Desconectado',
      color: 'text-gray-400',
      icon: '⚫'
    },
    failed: {
      label: 'Error',
      color: 'text-red-400',
      icon: '🔴'
    }
  };
  
  return statusMap[status as keyof typeof statusMap] || statusMap.disconnected;
}

/**
 * Formatea el estado del mensaje
 */
export function formatMessageStatus(status: string): {
  label: string;
  icon: string;
} {
  const statusMap = {
    pending: { label: 'Enviando', icon: '⏳' },
    sent: { label: 'Enviado', icon: '✓' },
    delivered: { label: 'Entregado', icon: '✓✓' },
    read: { label: 'Leído', icon: '✓✓' },
    failed: { label: 'Fallido', icon: '❌' }
  };
  
  return statusMap[status as keyof typeof statusMap] || statusMap.pending;
}

// ===== FORMATEO DE TAMAÑOS =====

/**
 * Formatea tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== FORMATEO DE TIEMPO =====

/**
 * Formatea duración en segundos a mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formatea tiempo estimado para cola
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.ceil(seconds / 3600);
  return `${hours} hora${hours !== 1 ? 's' : ''}`;
}

// ===== FORMATEO DE RATE LIMITS =====

/**
 * Formatea información de rate limit
 */
export function formatRateLimit(usage: number, limit: number): {
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  label: string;
} {
  const percentage = (usage / limit) * 100;
  
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage >= 90) status = 'danger';
  else if (percentage >= 75) status = 'warning';
  
  return {
    percentage,
    status,
    label: `${formatNumber(usage)} / ${formatNumber(limit)} (${formatPercentage(percentage)})`
  };
}

// ===== VALIDADORES =====

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ===== FORMATEO DE NOMBRES =====

/**
 * Obtiene iniciales de un nombre para avatar
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Formatea nombre para mostrar
 */
export function formatContactName(name: string, phone: string): string {
  if (name && name !== phone) {
    return name;
  }
  return formatPhoneNumber(phone);
}