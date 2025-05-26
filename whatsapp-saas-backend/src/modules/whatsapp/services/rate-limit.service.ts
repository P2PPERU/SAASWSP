// src/modules/whatsapp/services/rate-limit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis;

  // Límites por plan
  private readonly LIMITS = {
    basic: {
      messagesPerMinute: 20,
      messagesPerHour: 500,
      messagesPerDay: 5000,
      messagesPerMonth: 50000,
    },
    pro: {
      messagesPerMinute: 60,
      messagesPerHour: 2000,
      messagesPerDay: 20000,
      messagesPerMonth: 200000,
    },
    enterprise: {
      messagesPerMinute: 200,
      messagesPerHour: 10000,
      messagesPerDay: 100000,
      messagesPerMonth: 1000000,
    },
  };

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      keyPrefix: 'ratelimit:',
    });
  }

  /**
   * Verificar si se puede enviar un mensaje
   */
  async canSendMessage(tenantId: string, plan: string = 'basic'): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    limits?: any;
  }> {
    const limits = this.LIMITS[plan] || this.LIMITS.basic;
    const now = Date.now();

    // Verificar múltiples ventanas de tiempo
    const checks = [
      { window: 'minute', ttl: 60, limit: limits.messagesPerMinute },
      { window: 'hour', ttl: 3600, limit: limits.messagesPerHour },
      { window: 'day', ttl: 86400, limit: limits.messagesPerDay },
      { window: 'month', ttl: 2592000, limit: limits.messagesPerMonth },
    ];

    for (const check of checks) {
      const key = `${tenantId}:${check.window}:${Math.floor(now / (check.ttl * 1000))}`;
      const count = await this.redis.incr(key);
      
      if (count === 1) {
        await this.redis.expire(key, check.ttl);
      }

      if (count > check.limit) {
        const retryAfter = check.ttl - (now / 1000) % check.ttl;
        
        return {
          allowed: false,
          reason: `Límite de ${check.limit} mensajes por ${check.window} excedido`,
          retryAfter: Math.ceil(retryAfter),
          limits: {
            window: check.window,
            used: count,
            limit: check.limit,
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Obtener uso actual
   */
  async getCurrentUsage(tenantId: string, plan: string = 'basic') {
    const limits = this.LIMITS[plan] || this.LIMITS.basic;
    const now = Date.now();

    const usage = {
      minute: await this.getCount(tenantId, 'minute', now, 60),
      hour: await this.getCount(tenantId, 'hour', now, 3600),
      day: await this.getCount(tenantId, 'day', now, 86400),
      month: await this.getCount(tenantId, 'month', now, 2592000),
    };

    return {
      usage,
      limits: {
        minute: limits.messagesPerMinute,
        hour: limits.messagesPerHour,
        day: limits.messagesPerDay,
        month: limits.messagesPerMonth,
      },
      percentages: {
        minute: (usage.minute / limits.messagesPerMinute) * 100,
        hour: (usage.hour / limits.messagesPerHour) * 100,
        day: (usage.day / limits.messagesPerDay) * 100,
        month: (usage.month / limits.messagesPerMonth) * 100,
      },
    };
  }

  /**
   * Resetear límites (útil para testing o casos especiales)
   */
  async resetLimits(tenantId: string) {
    const pattern = `${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    this.logger.log(`Límites reseteados para tenant ${tenantId}`);
  }

  /**
   * Aplicar límite de WhatsApp Business API
   */
  async checkWhatsAppLimits(phoneNumber: string): Promise<{
    allowed: boolean;
    tier?: string;
    limit?: number;
  }> {
    // WhatsApp Business API tiene límites por niveles:
    // Tier 1: 1,000 conversaciones únicas por día
    // Tier 2: 10,000 conversaciones únicas por día
    // Tier 3: 100,000 conversaciones únicas por día
    // Tier 4: Sin límite

    const key = `whatsapp:${phoneNumber}:conversations:${this.getTodayKey()}`;
    const count = await this.redis.scard(key); // Usar SET para contar únicos

    // Determinar tier basado en historial (simplificado)
    const tier = await this.determineWhatsAppTier(phoneNumber);
    const limits = {
      1: 1000,
      2: 10000,
      3: 100000,
      4: Infinity,
    };

    const limit = limits[tier] || limits[1];

    return {
      allowed: count < limit,
      tier: `Tier ${tier}`,
      limit,
    };
  }

  private async getCount(tenantId: string, window: string, now: number, ttl: number): Promise<number> {
    const key = `${tenantId}:${window}:${Math.floor(now / (ttl * 1000))}`;
    const count = await this.redis.get(key);
    return parseInt(count || '0', 10);
  }

  private getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  private async determineWhatsAppTier(phoneNumber: string): Promise<number> {
    // Lógica simplificada - en producción esto vendría de WhatsApp Business API
    const historyKey = `whatsapp:${phoneNumber}:tier`;
    const tier = await this.redis.get(historyKey);
    return parseInt(tier || '1', 10);
  }
}