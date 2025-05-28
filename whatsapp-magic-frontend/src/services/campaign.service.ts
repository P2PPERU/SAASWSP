// src/services/campaign.service.ts
import { api } from '@/lib/api-client';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  type: 'broadcast' | 'drip' | 'promotional' | 'reminder' | 'sequence';
  message: string;
  targetAudience: {
    total: number;
    segments: string[];
    filters?: {
      lastActivity?: number; // days
      tags?: string[];
      location?: string;
      customFields?: Record<string, any>;
    };
  };
  schedule: {
    startDate: string;
    endDate?: string;
    timezone: string;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
    days?: number[]; // for weekly: 0=Sunday, 1=Monday, etc.
    time?: string; // HH:MM format
  };
  results: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    clicked?: number; // for links
    converted?: number; // if tracking conversions
  };
  settings: {
    delayBetweenMessages?: number; // milliseconds
    personalizeMessage?: boolean;
    trackClicks?: boolean;
    trackConversions?: boolean;
    stopOnReply?: boolean;
    maxRecipientsPerBatch?: number;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  message: string;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  filters: {
    lastActivity?: number;
    tags?: string[];
    location?: string;
    customFields?: Record<string, any>;
  };
  createdAt: string;
}

export interface CampaignStats {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalMessagesSent: number;
    averageDeliveryRate: number;
    averageReadRate: number;
    averageReplyRate: number;
  };
  recent: Array<{
    id: string;
    name: string;
    status: string;
    sent: number;
    deliveryRate: number;
    date: string;
  }>;
  performance: {
    topPerforming: Array<{
      id: string;
      name: string;
      replyRate: number;
      conversionRate?: number;
    }>;
    byType: Record<string, {
      campaigns: number;
      avgDeliveryRate: number;
      avgReplyRate: number;
    }>;
  };
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: Campaign['type'];
  message: string;
  targetAudience: {
    segments: string[];
    filters?: Campaign['targetAudience']['filters'];
  };
  schedule: Campaign['schedule'];
  settings?: Campaign['settings'];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  message?: string;
  targetAudience?: Partial<Campaign['targetAudience']>;
  schedule?: Partial<Campaign['schedule']>;
  settings?: Partial<Campaign['settings']>;
}

class CampaignService {
  private readonly basePath = '/campaigns';

  // CRUD Campaigns
  async getCampaigns(filters?: {
    status?: Campaign['status'];
    type?: Campaign['type'];
    limit?: number;
    offset?: number;
  }): Promise<{
    campaigns: Campaign[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const response = await api.get(this.basePath, { params: filters });
    return response.data.data;
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.get(`${this.basePath}/${campaignId}`);
    return response.data.data;
  }

  async createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
    const response = await api.post(this.basePath, data);
    return response.data.data;
  }

  async updateCampaign(campaignId: string, data: UpdateCampaignRequest): Promise<Campaign> {
    const response = await api.put(`${this.basePath}/${campaignId}`, data);
    return response.data.data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await api.delete(`${this.basePath}/${campaignId}`);
  }

  async duplicateCampaign(campaignId: string, newName?: string): Promise<Campaign> {
    const response = await api.post(`${this.basePath}/${campaignId}/duplicate`, {
      name: newName
    });
    return response.data.data;
  }

  // Campaign Control
  async startCampaign(campaignId: string): Promise<{
    campaign: Campaign;
    jobId: string;
    estimatedCompletion: string;
  }> {
    const response = await api.post(`${this.basePath}/${campaignId}/start`);
    return response.data.data;
  }

  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post(`${this.basePath}/${campaignId}/pause`);
    return response.data.data;
  }

  async resumeCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post(`${this.basePath}/${campaignId}/resume`);
    return response.data.data;
  }

  async stopCampaign(campaignId: string): Promise<Campaign> {
    const response = await api.post(`${this.basePath}/${campaignId}/stop`);
    return response.data.data;
  }

  // Campaign Analytics
  async getCampaignStats(campaignId: string): Promise<{
    campaign: Campaign;
    stats: {
      hourly: Array<{ hour: string; sent: number; delivered: number; }>;
      daily: Array<{ date: string; sent: number; delivered: number; read: number; }>;
      devices: Record<string, number>;
      locations: Record<string, number>;
    };
    messages: Array<{
      id: string;
      recipient: string;
      status: string;
      sentAt: string;
      deliveredAt?: string;
      readAt?: string;
      repliedAt?: string;
      error?: string;
    }>;
  }> {
    const response = await api.get(`${this.basePath}/${campaignId}/stats`);
    return response.data.data;
  }

  async getOverallStats(): Promise<CampaignStats> {
    const response = await api.get(`${this.basePath}/stats`);
    return response.data.data;
  }

  // Templates
  async getTemplates(category?: string): Promise<CampaignTemplate[]> {
    const response = await api.get(`${this.basePath}/templates`, {
      params: { category }
    });
    return response.data.data;
  }

  async createTemplate(template: {
    name: string;
    category: string;
    description: string;
    message: string;
    tags: string[];
    isPublic?: boolean;
  }): Promise<CampaignTemplate> {
    const response = await api.post(`${this.basePath}/templates`, template);
    return response.data.data;
  }

  async useTemplate(templateId: string): Promise<{
    message: string;
    suggestedName: string;
    suggestedType: Campaign['type'];
  }> {
    const response = await api.get(`${this.basePath}/templates/${templateId}/use`);
    return response.data.data;
  }

  // Audience Management
  async getAudienceSegments(): Promise<AudienceSegment[]> {
    const response = await api.get(`${this.basePath}/audience/segments`);
    return response.data.data;
  }

  async createAudienceSegment(segment: {
    name: string;
    description: string;
    filters: AudienceSegment['filters'];
  }): Promise<AudienceSegment> {
    const response = await api.post(`${this.basePath}/audience/segments`, segment);
    return response.data.data;
  }

  async previewAudience(filters: AudienceSegment['filters']): Promise<{
    totalContacts: number;
    sampleContacts: Array<{
      name: string;
      phone: string;
      lastActivity: string;
      tags: string[];
    }>;
    breakdown: {
      byLocation: Record<string, number>;
      byTag: Record<string, number>;
      byLastActivity: Record<string, number>;
    };
  }> {
    const response = await api.post(`${this.basePath}/audience/preview`, { filters });
    return response.data.data;
  }

  // Message Preview & Testing
  async previewMessage(data: {
    message: string;
    sampleContact?: {
      name: string;
      phone: string;
      customFields?: Record<string, any>;
    };
  }): Promise<{
    renderedMessage: string;
    characterCount: number;
    estimatedCost: number;
    warnings: string[];
  }> {
    const response = await api.post(`${this.basePath}/preview`, data);
    return response.data.data;
  }

  async sendTestMessage(data: {
    message: string;
    recipients: string[];
    instanceId: string;
  }): Promise<{
    sent: number;
    failed: number;
    details: Array<{
      recipient: string;
      status: 'sent' | 'failed';
      error?: string;
    }>;
  }> {
    const response = await api.post(`${this.basePath}/test`, data);
    return response.data.data;
  }

  // Export & Reports
  async exportCampaignData(campaignId: string, format: 'csv' | 'xlsx' | 'json'): Promise<Blob> {
    const response = await api.get(`${this.basePath}/${campaignId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async generateReport(campaignId: string): Promise<{
    reportUrl: string;
    expiresAt: string;
  }> {
    const response = await api.post(`${this.basePath}/${campaignId}/report`);
    return response.data.data;
  }

  // Drip Campaign Specific
  async createDripSequence(data: {
    name: string;
    description?: string;
    messages: Array<{
      message: string;
      delayDays: number;
      conditions?: Record<string, any>;
    }>;
    targetAudience: Campaign['targetAudience'];
  }): Promise<Campaign> {
    const response = await api.post(`${this.basePath}/drip`, data);
    return response.data.data;
  }

  async getDripSequenceStatus(campaignId: string): Promise<{
    totalContacts: number;
    contactsInProgress: number;
    contactsCompleted: number;
    contactsStopped: number;
    messageBreakdown: Array<{
      messageIndex: number;
      contactsWaiting: number;
      contactsSent: number;
      avgDaysToSend: number;
    }>;
  }> {
    const response = await api.get(`${this.basePath}/${campaignId}/drip/status`);
    return response.data.data;
  }
}

export const campaignService = new CampaignService();