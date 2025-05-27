// src/services/whatsapp.service.ts
import { api } from '@/lib/api-client';
import {
  WhatsAppInstance,
  Conversation,
  Message,
  CreateInstanceDto,
  UpdateInstanceDto,
  SendMessageDto,
  BulkMessageDto,
  ScheduleMessageDto,
  ConnectionStatusResponse,
  QueueStats,
  RateLimitUsage,
} from '@/types/whatsapp.types';

class WhatsAppService {
  private readonly basePath = '/whatsapp';

  // ========== INSTANCES ==========
  
  async createInstance(data: CreateInstanceDto) {
    const response = await api.post(`${this.basePath}/instances`, data);
    return response.data;
  }

  async getInstances() {
    const response = await api.get<{
      message: string;
      data: WhatsAppInstance[];
      total: number;
    }>(`${this.basePath}/instances`);
    return response.data;
  }

  async getInstance(instanceId: string) {
    const response = await api.get<{
      message: string;
      data: WhatsAppInstance;
    }>(`${this.basePath}/instances/${instanceId}`);
    return response.data;
  }

  async updateInstance(instanceId: string, data: UpdateInstanceDto) {
    const response = await api.put(`${this.basePath}/instances/${instanceId}`, data);
    return response.data;
  }

  async deleteInstance(instanceId: string) {
    const response = await api.delete(`${this.basePath}/instances/${instanceId}`);
    return response.data;
  }

  // ========== CONNECTION ==========

  async connectInstance(instanceId: string) {
    const response = await api.post<{
      message: string;
      data: {
        instance: WhatsAppInstance;
        qrCode?: string;
        connected: boolean;
      };
    }>(`${this.basePath}/instances/${instanceId}/connect`);
    return response.data;
  }

  async getConnectionStatus(instanceId: string) {
    const response = await api.get<{
      message: string;
      data: ConnectionStatusResponse;
    }>(`${this.basePath}/instances/${instanceId}/connection-status`);
    return response.data;
  }

  async disconnectInstance(instanceId: string) {
    const response = await api.post(`${this.basePath}/instances/${instanceId}/disconnect`);
    return response.data;
  }

  // ========== MESSAGES ==========

  async sendMessage(instanceId: string, data: SendMessageDto) {
    const response = await api.post<{
      message: string;
      data: {
        message: Message;
        conversation: Conversation;
        job: {
          id: string;
          status: string;
        };
      };
    }>(`${this.basePath}/instances/${instanceId}/messages/send`, data);
    return response.data;
  }

  async sendBulkMessages(instanceId: string, data: BulkMessageDto) {
    const response = await api.post<{
      message: string;
      data: {
        totalQueued: number;
        estimatedTime: number;
        jobs: string[];
      };
    }>(`${this.basePath}/instances/${instanceId}/messages/bulk`, data);
    return response.data;
  }

  async scheduleMessage(instanceId: string, data: ScheduleMessageDto) {
    const response = await api.post<{
      message: string;
      data: {
        jobId: string;
        scheduledFor: Date;
        to: string;
      };
    }>(`${this.basePath}/instances/${instanceId}/messages/schedule`, data);
    return response.data;
  }

  // ========== CONVERSATIONS ==========

  async getConversations(instanceId: string) {
    const response = await api.get<{
      message: string;
      data: Conversation[];
      total: number;
    }>(`${this.basePath}/instances/${instanceId}/conversations`);
    return response.data;
  }

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const response = await api.get<{
      message: string;
      data: Message[];
      total: number;
      conversation: Conversation;
    }>(`${this.basePath}/conversations/${conversationId}/messages`, {
      params: { limit, offset },
    });
    return response.data;
  }

  // ========== QUEUE & STATS ==========

  async getQueueStats() {
    const response = await api.get<{
      message: string;
      data: QueueStats;
    }>(`${this.basePath}/queue/stats`);
    return response.data;
  }

  async getRateLimitUsage() {
    const response = await api.get<{
      message: string;
      data: RateLimitUsage;
    }>(`${this.basePath}/rate-limit/usage`);
    return response.data;
  }

  async retryFailedMessages() {
    const response = await api.post<{
      message: string;
      data: {
        retriedMessages: number;
      };
    }>(`${this.basePath}/queue/retry-failed`);
    return response.data;
  }
}

export const whatsappService = new WhatsAppService();