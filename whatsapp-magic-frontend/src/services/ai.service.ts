// src/services/ai.service.ts
import { api } from '@/lib/api-client';

export interface AIConfig {
  id: string;
  enabled: boolean;
  model: string;
  personality: 'professional' | 'friendly' | 'technical' | 'sales' | 'custom';
  responseMode: 'always' | 'business_hours' | 'outside_hours' | 'keywords' | 'manual';
  systemPrompt: string;
  welcomeMessage: string;
  keywords: string[];
  settings: {
    temperature: number;
    maxTokens: number;
    responseDelay: number;
    contextWindow: number;
    language: string;
  };
  limits: {
    maxTokensPerDay: number;
    maxTokensPerMonth: number;
  };
  usage: {
    tokensToday: number;
    tokensThisMonth: number;
  };
}

export interface AIStats {
  period: {
    start: string;
    end: string;
    days: number;
  };
  messages: {
    total: number;
    handledByAI: number;
    handledByHuman: number;
    aiResponseRate: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    tokensUsed: number;
    estimatedCost: number;
  };
  topIntents: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;
}

export interface AITemplate {
  industry: string;
  config: Partial<AIConfig>;
}

export interface TestAIRequest {
  message: string;
  context?: string[];
}

export interface TestAIResponse {
  response: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    temperature: number;
  };
}

class AIService {
  private readonly basePath = '/ai';

  // Configuración
  async getConfig(): Promise<AIConfig> {
    const response = await api.get(`${this.basePath}/config`);
    return response.data.data;
  }

  async updateConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const response = await api.put(`${this.basePath}/config`, config);
    return response.data.data;
  }

  async toggleAI(enabled: boolean): Promise<void> {
    await api.post(`${this.basePath}/toggle`, { enabled });
  }

  // Estadísticas
  async getStats(period: 'today' | 'week' | 'month' = 'week'): Promise<AIStats> {
    const response = await api.get(`${this.basePath}/stats`, {
      params: { period }
    });
    return response.data.data;
  }

  // Test de IA
  async testResponse(data: TestAIRequest): Promise<TestAIResponse> {
    const response = await api.post(`${this.basePath}/test`, data);
    return response.data;
  }

  // Plantillas
  async getTemplates(): Promise<AITemplate[]> {
    const response = await api.get(`${this.basePath}/templates`);
    return response.data;
  }

  async applyTemplate(industry: string): Promise<AIConfig> {
    const response = await api.post(`${this.basePath}/templates/apply`, { industry });
    return response.data.config;
  }

  // Respuestas personalizadas
  async getCustomResponses(): Promise<Record<string, string>> {
    const response = await api.get(`${this.basePath}/custom-responses`);
    return response.data.data;
  }

  async updateCustomResponses(responses: Record<string, string>): Promise<void> {
    await api.put(`${this.basePath}/custom-responses`, responses);
  }

  // Health check
  async checkHealth(): Promise<{ status: string; configured: boolean }> {
    const response = await api.get(`${this.basePath}/health`);
    return response.data.data;
  }

  // Resetear contadores
  async resetUsage(): Promise<void> {
    await api.post(`${this.basePath}/reset-usage`);
  }

  // Historial de configuración
  async getConfigHistory(): Promise<Array<{
    id: string;
    changes: Record<string, any>;
    changedBy: string;
    changedAt: string;
  }>> {
    const response = await api.get(`${this.basePath}/config/history`);
    return response.data.data;
  }
}

export const aiService = new AIService();