// src/services/tenant.service.ts
import { api } from '@/lib/api-client';

export interface Tenant {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    companyInfo?: {
      website?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      industry?: string;
      size?: string;
    };
    notifications?: {
      email: boolean;
      whatsapp: boolean;
      slack: boolean;
      webhooks: boolean;
    };
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };
  limits: {
    maxUsers: number;
    maxInstances: number;
    maxMessages: number;
    maxConversations: number;
    maxStorage: number; // MB
  };
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastLoginAt?: string;
  permissions: string[];
  createdAt: string;
  invitedBy?: string;
}

export interface TenantUsage {
  tenant: {
    id: string;
    name: string;
    plan: string;
  };
  usage: {
    users: {
      current: number;
      limit: number;
      percentage: number;
    };
    instances: {
      current: number;
      limit: number;
      percentage: number;
    };
    messages: {
      current: number;
      limit: number;
      percentage: number;
    };
    storage: {
      current: number; // MB
      limit: number; // MB
      percentage: number;
    };
  };
  period: {
    start: string;
    end: string;
  };
}

export interface InviteUserRequest {
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions?: string[];
  sendEmail?: boolean;
}

export interface UpdateTenantRequest {
  name?: string;
  settings?: Partial<Tenant['settings']>;
}

export interface UpdateUserRequest {
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
  status?: 'active' | 'inactive' | 'pending';
  permissions?: string[];
}

class TenantService {
  private readonly basePath = '/tenant';

  // Información del tenant
  async getTenant(): Promise<Tenant> {
    const response = await api.get(this.basePath);
    return response.data.data;
  }

  async updateTenant(data: UpdateTenantRequest): Promise<Tenant> {
    const response = await api.put(this.basePath, data);
    return response.data.data;
  }

  // Configuración específica
  async getSettings(): Promise<Tenant['settings']> {
    const response = await api.get(`${this.basePath}/settings`);
    return response.data.data;
  }

  async updateSettings(settings: Partial<Tenant['settings']>): Promise<Tenant['settings']> {
    const response = await api.put(`${this.basePath}/settings`, settings);
    return response.data.data;
  }

  // Usuarios del tenant
  async getUsers(): Promise<TenantUser[]> {
    const response = await api.get(`${this.basePath}/users`);
    return response.data.data;
  }

  async inviteUser(userData: InviteUserRequest): Promise<{
    user: TenantUser;
    inviteToken?: string;
  }> {
    const response = await api.post(`${this.basePath}/users/invite`, userData);
    return response.data.data;
  }

  async updateUser(userId: string, data: UpdateUserRequest): Promise<TenantUser> {
    const response = await api.put(`${this.basePath}/users/${userId}`, data);
    return response.data.data;
  }

  async removeUser(userId: string): Promise<void> {
    await api.delete(`${this.basePath}/users/${userId}`);
  }

  async resendInvite(userId: string): Promise<void> {
    await api.post(`${this.basePath}/users/${userId}/resend-invite`);
  }

  // Estadísticas de uso
  async getUsage(): Promise<TenantUsage> {
    const response = await api.get(`${this.basePath}/usage`);
    return response.data.data;
  }

  // Dashboard del tenant
  async getDashboard(): Promise<{
    overview: {
      totalUsers: number;
      totalInstances: number;
      connectedInstances: number;
      totalMessages: number;
      activeConversations: number;
    };
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: string;
      user?: string;
    }>;
    usage: {
      messagesThisMonth: number;
      storageUsed: number;
      instancesActive: number;
    };
    alerts: Array<{
      type: 'warning' | 'info' | 'error';
      message: string;
      timestamp: string;
    }>;
  }> {
    const response = await api.get(`${this.basePath}/dashboard`);
    return response.data.data;
  }

  // Gestión de plan
  async upgradePlan(plan: 'basic' | 'pro' | 'enterprise'): Promise<{
    tenant: Tenant;
    billingUrl?: string;
  }> {
    const response = await api.post(`${this.basePath}/upgrade`, { plan });
    return response.data.data;
  }

  async cancelPlan(): Promise<void> {
    await api.post(`${this.basePath}/cancel`);
  }

  // Branding
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post(`${this.basePath}/branding/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data.logoUrl;
  }

  async updateBranding(branding: {
    primaryColor?: string;
    secondaryColor?: string;
  }): Promise<void> {
    await api.put(`${this.basePath}/branding`, branding);
  }

  // Configuración de notificaciones
  async getNotificationSettings(): Promise<{
    email: {
      enabled: boolean;
      events: string[];
    };
    whatsapp: {
      enabled: boolean;
      phoneNumber?: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    webhooks: {
      enabled: boolean;
      urls: Array<{
        url: string;
        events: string[];
        secret?: string;
      }>;
    };
  }> {
    const response = await api.get(`${this.basePath}/notifications`);
    return response.data.data;
  }

  async updateNotificationSettings(settings: {
    email?: {
      enabled: boolean;
      events: string[];
    };
    whatsapp?: {
      enabled: boolean;
      phoneNumber?: string;
    };
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    webhooks?: {
      enabled: boolean;
      urls: Array<{
        url: string;
        events: string[];
        secret?: string;
      }>;
    };
  }): Promise<void> {
    await api.put(`${this.basePath}/notifications`, settings);
  }

  // Seguridad
  async enable2FA(): Promise<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }> {
    const response = await api.post(`${this.basePath}/security/2fa/enable`);
    return response.data.data;
  }

  async disable2FA(code: string): Promise<void> {
    await api.post(`${this.basePath}/security/2fa/disable`, { code });
  }

  async getSecurityLog(): Promise<Array<{
    event: string;
    description: string;
    ipAddress: string;
    userAgent: string;
    userId?: string;
    timestamp: string;
  }>> {
    const response = await api.get(`${this.basePath}/security/log`);
    return response.data.data;
  }

  // API Keys para integraciones
  async getApiKeys(): Promise<Array<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    lastUsed?: string;
    createdAt: string;
  }>> {
    const response = await api.get(`${this.basePath}/api-keys`);
    return response.data.data;
  }

  async createApiKey(data: {
    name: string;
    permissions: string[];
  }): Promise<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
  }> {
    const response = await api.post(`${this.basePath}/api-keys`, data);
    return response.data.data;
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await api.delete(`${this.basePath}/api-keys/${keyId}`);
  }

  // Eliminar tenant (danger zone)
  async deleteTenant(confirmation: string): Promise<void> {
    await api.delete(this.basePath, {
      data: { confirmation }
    });
  }
}

export const tenantService = new TenantService();