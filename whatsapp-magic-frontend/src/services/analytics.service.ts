// src/services/analytics.service.ts
import { api } from '@/lib/api-client';

export interface DashboardData {
  realtime: {
    messagessentToday: number;
    messagesReceivedToday: number;
    failedMessagesToday: number;
    activeConversations: number;
  };
  messages: {
    total: number;
    byDate: Record<string, {
      sent: number;
      received: number;
      failed: number;
    }>;
  };
  conversations: {
    total: number;
    active: number;
    archived: number;
    closed: number;
  };
  instances: Array<{
    id: string;
    name: string;
    status: string;
    uptime: number;
  }>;
  performance: {
    averageResponseTime: number;
    uptime: number;
  };
}

export interface UsagePatterns {
  hourly: Array<{
    hour: number;
    count: number;
  }>;
  daily: Array<{
    day: string;
    count: number;
  }>;
  peakHours: number[];
  recommendation: string;
}

export interface AnalyticsReport {
  period: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalMessages: number;
    totalConversations: number;
    responseRate: number;
    averageResponseTime: number;
  };
  charts: {
    messagesOverTime: Array<{
      date: string;
      sent: number;
      received: number;
    }>;
    conversationsByStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    instancesPerformance: Array<{
      instanceId: string;
      name: string;
      uptime: number;
      messages: number;
    }>;
  };
  insights: string[];
  recommendations: string[];
}

export interface AnalyticsSummary {
  period: string;
  kpis: {
    totalMessages: number;
    activeConversations: number;
    connectedInstances: number;
    avgResponseTime: number;
    uptime: number;
  };
  trends: {
    messageGrowth: number;
    peakHours: number[];
    mostActiveDay: string;
  };
  recommendations: string;
  lastUpdated: string;
}

export interface CustomEvent {
  type: string;
  instanceId?: string;
  metadata?: Record<string, any>;
}

export interface RealtimeMetrics {
  activeConnections: number;
  messagesPerMinute: number;
  queueSize: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
}

class AnalyticsService {
  private readonly basePath = '/analytics';

  // Dashboard principal
  async getDashboard(period: 'today' | 'week' | 'month' = 'week'): Promise<DashboardData> {
    const response = await api.get(`${this.basePath}/dashboard`, {
      params: { period }
    });
    return response.data.data;
  }

  // Patrones de uso
  async getUsagePatterns(days: number = 30): Promise<UsagePatterns> {
    const response = await api.get(`${this.basePath}/usage-patterns`, {
      params: { days }
    });
    return response.data.data;
  }

  // Reporte detallado
  async generateReport(
    startDate: string, 
    endDate: string, 
    format: 'json' | 'csv' = 'json'
  ): Promise<AnalyticsReport | Blob> {
    const response = await api.get(`${this.basePath}/report`, {
      params: { startDate, endDate, format },
      responseType: format === 'csv' ? 'blob' : 'json'
    });
    
    if (format === 'csv') {
      return response.data;
    }
    
    return response.data.data;
  }

  // Resumen ejecutivo
  async getSummary(period: 'today' | 'week' | 'month' = 'week'): Promise<AnalyticsSummary> {
    const response = await api.get(`${this.basePath}/summary`, {
      params: { period }
    });
    return response.data.data;
  }

  // Métricas en tiempo real
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const response = await api.get(`${this.basePath}/realtime`);
    return response.data.data;
  }

  // Registrar evento personalizado
  async trackEvent(event: CustomEvent): Promise<void> {
    await api.post(`${this.basePath}/events`, event);
  }

  // Analytics por instancia específica
  async getInstanceAnalytics(
    instanceId: string, 
    period: 'today' | 'week' | 'month' = 'week'
  ): Promise<{
    messages: {
      sent: number;
      received: number;
      failed: number;
    };
    conversations: {
      total: number;
      active: number;
    };
    performance: {
      uptime: number;
      averageResponseTime: number;
    };
    chart: Array<{
      date: string;
      messages: number;
    }>;
  }> {
    const response = await api.get(`${this.basePath}/instances/${instanceId}`, {
      params: { period }
    });
    return response.data.data;
  }

  // Comparar períodos
  async comparePeriods(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<{
    current: Partial<AnalyticsSummary>;
    previous: Partial<AnalyticsSummary>;
    changes: {
      messages: number;
      conversations: number;
      responseTime: number;
      uptime: number;
    };
  }> {
    const response = await api.get(`${this.basePath}/compare`, {
      params: {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      }
    });
    return response.data.data;
  }

  // Analytics de IA
  async getAIAnalytics(period: 'today' | 'week' | 'month' = 'week'): Promise<{
    messagesHandled: number;
    successRate: number;
    averageResponseTime: number;
    tokensUsed: number;
    topIntents: Array<{
      intent: string;
      count: number;
    }>;
    satisfactionScore: number;
  }> {
    const response = await api.get(`${this.basePath}/ai`, {
      params: { period }
    });
    return response.data.data;
  }

  // Exportar datos
  async exportData(
    type: 'messages' | 'conversations' | 'analytics',
    format: 'json' | 'csv' | 'xlsx',
    filters?: {
      startDate?: string;
      endDate?: string;
      instanceId?: string;
    }
  ): Promise<Blob> {
    const response = await api.get(`${this.basePath}/export/${type}`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  }

  // Configurar alertas
  async setAlerts(alerts: {
    messageVolume?: {
      threshold: number;
      enabled: boolean;
    };
    responseTime?: {
      threshold: number;
      enabled: boolean;
    };
    errorRate?: {
      threshold: number;
      enabled: boolean;
    };
    uptime?: {
      threshold: number;
      enabled: boolean;
    };
  }): Promise<void> {
    await api.post(`${this.basePath}/alerts`, alerts);
  }

  // Obtener alertas configuradas
  async getAlerts(): Promise<{
    messageVolume: { threshold: number; enabled: boolean };
    responseTime: { threshold: number; enabled: boolean };
    errorRate: { threshold: number; enabled: boolean };
    uptime: { threshold: number; enabled: boolean };
  }> {
    const response = await api.get(`${this.basePath}/alerts`);
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();