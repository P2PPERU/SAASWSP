// src/modules/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Message, Conversation, WhatsAppInstance } from '../../database/entities';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      keyPrefix: 'analytics:',
    });
  }

  /**
   * Registrar evento en tiempo real
   */
  async trackEvent(event: {
    type: 'message_sent' | 'message_received' | 'message_failed' | 'instance_connected' | 'instance_disconnected';
    tenantId: string;
    instanceId?: string;
    metadata?: any;
  }) {
    const timestamp = Date.now();
    const dateKey = new Date().toISOString().split('T')[0];

    // Incrementar contadores
    await Promise.all([
      // Contador global
      this.redis.hincrby(`events:${dateKey}`, event.type, 1),
      // Contador por tenant
      this.redis.hincrby(`tenant:${event.tenantId}:${dateKey}`, event.type, 1),
      // Serie temporal para gráficos
      this.redis.zadd(
        `timeseries:${event.type}:${dateKey}`,
        timestamp,
        JSON.stringify({ tenantId: event.tenantId, ...event.metadata })
      ),
    ]);

    // Evento en tiempo real para websockets
    await this.redis.publish('analytics:realtime', JSON.stringify({
      ...event,
      timestamp,
    }));
  }

  /**
   * Obtener métricas del dashboard
   */
  async getDashboardMetrics(tenantId: string, period: 'today' | 'week' | 'month' = 'today') {
    const now = new Date();
    const startDate = this.getStartDate(period);

    // Métricas en tiempo real desde Redis
    const realtimeMetrics = await this.getRealtimeMetrics(tenantId);

    // Métricas históricas desde PostgreSQL
    const [
      messageStats,
      conversationStats,
      instanceStats,
      responseTime,
    ] = await Promise.all([
      this.getMessageStats(tenantId, startDate, now),
      this.getConversationStats(tenantId, startDate, now),
      this.getInstanceStats(tenantId),
      this.getAverageResponseTime(tenantId, startDate, now),
    ]);

    return {
      realtime: realtimeMetrics,
      messages: messageStats,
      conversations: conversationStats,
      instances: instanceStats,
      performance: {
        averageResponseTime: responseTime,
        uptime: await this.calculateUptime(tenantId),
      },
      period,
    };
  }

  /**
   * Métricas en tiempo real
   */
  private async getRealtimeMetrics(tenantId: string) {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await this.redis.hgetall(`tenant:${tenantId}:${today}`);

    return {
      messagessentToday: parseInt(metrics.message_sent || '0'),
      messagesReceivedToday: parseInt(metrics.message_received || '0'),
      failedMessagesToday: parseInt(metrics.message_failed || '0'),
      activeConversations: await this.getActiveConversationsCount(tenantId),
    };
  }

  /**
   * Estadísticas de mensajes
   */
  private async getMessageStats(tenantId: string, startDate: Date, endDate: Date) {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('DATE(message.createdAt)', 'date')
      .addSelect('message.direction', 'direction')
      .addSelect('message.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('DATE(message.createdAt)')
      .addGroupBy('message.direction')
      .addGroupBy('message.status')
      .getRawMany();

    // Procesar para formato de gráfico
    const byDate = {};
    messages.forEach(row => {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          sent: 0,
          received: 0,
          failed: 0,
        };
      }

      if (row.direction === 'outbound') {
        if (row.status === 'failed') {
          byDate[row.date].failed += parseInt(row.count);
        } else {
          byDate[row.date].sent += parseInt(row.count);
        }
      } else {
        byDate[row.date].received += parseInt(row.count);
      }
    });

    return {
      total: messages.reduce((sum, row) => sum + parseInt(row.count), 0),
      byDate,
      byStatus: this.groupByStatus(messages),
    };
  }

  /**
   * Estadísticas de conversaciones
   */
  private async getConversationStats(tenantId: string, startDate: Date, endDate: Date) {
    const stats = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.lastMessageAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('conversation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('conversation.status')
      .getRawMany();

    const total = stats.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    return {
      total,
      active: parseInt(stats.find(s => s.status === 'active')?.count || '0'),
      archived: parseInt(stats.find(s => s.status === 'archived')?.count || '0'),
      closed: parseInt(stats.find(s => s.status === 'closed')?.count || '0'),
      newToday: await this.getNewConversationsToday(tenantId),
    };
  }

  /**
   * Análisis de patrones de uso
   */
  async getUsagePatterns(tenantId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const hourlyPattern = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('EXTRACT(HOUR FROM message.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .groupBy('hour')
      .orderBy('hour')
      .getRawMany();

    const dayPattern = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('EXTRACT(DOW FROM message.createdAt)', 'dayOfWeek')
      .addSelect('COUNT(*)', 'count')
      .groupBy('dayOfWeek')
      .orderBy('dayOfWeek')
      .getRawMany();

    return {
      hourly: hourlyPattern.map(h => ({
        hour: parseInt(h.hour),
        count: parseInt(h.count),
      })),
      daily: dayPattern.map(d => ({
        day: this.getDayName(parseInt(d.dayOfWeek)),
        count: parseInt(d.count),
      })),
      peakHours: this.findPeakHours(hourlyPattern),
      recommendation: this.generateUsageRecommendation(hourlyPattern, dayPattern),
    };
  }

  /**
   * Exportar reporte
   */
  async generateReport(tenantId: string, startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json') {
    const [messages, conversations, instances] = await Promise.all([
      this.getDetailedMessageReport(tenantId, startDate, endDate),
      this.getDetailedConversationReport(tenantId, startDate, endDate),
      this.getInstanceReport(tenantId),
    ]);

    const report = {
      tenant: tenantId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalMessages: messages.length,
        totalConversations: conversations.length,
        activeInstances: instances.filter(i => i.status === 'connected').length,
      },
      messages,
      conversations,
      instances,
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      return this.convertToCSV(report);
    }

    return report;
  }

  // Métodos auxiliares
  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(now.setHours(0, 0, 0, 0));
    }
  }

  private getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex];
  }

  private findPeakHours(hourlyData: any[]): number[] {
    const sorted = [...hourlyData].sort((a, b) => parseInt(b.count) - parseInt(a.count));
    return sorted.slice(0, 3).map(h => parseInt(h.hour));
  }

  private generateUsageRecommendation(hourly: any[], daily: any[]): string {
    const peakHours = this.findPeakHours(hourly);
    const peakDay = daily.sort((a, b) => parseInt(b.count) - parseInt(a.count))[0];
    
    return `Tus horas pico son ${peakHours.join(', ')}h. ` +
           `El día con más actividad es ${this.getDayName(parseInt(peakDay.dayOfWeek))}. ` +
           `Considera programar mensajes importantes durante estos períodos.`;
  }

  private async getActiveConversationsCount(tenantId: string): Promise<number> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.status = :status', { status: 'active' })
      .getCount();
  }

  private groupByStatus(messages: any[]): Record<string, number> {
    const result = {};
    messages.forEach(row => {
      if (!result[row.status]) {
        result[row.status] = 0;
      }
      result[row.status] += parseInt(row.count);
    });
    return result;
  }

  private async getNewConversationsToday(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.createdAt >= :today', { today })
      .getCount();
  }

  private async calculateUptime(tenantId: string): Promise<number> {
    // Simplificado - en producción esto vendría de un sistema de monitoreo
    return 99.9;
  }

  private async getInstanceStats(tenantId: string) {
    const instances = await this.instanceRepository.find({
      where: { tenantId },
    });

    return instances.map(instance => ({
      id: instance.id,
      name: instance.name,
      status: instance.status,
      phoneNumber: instance.phoneNumber,
      lastConnectionAt: instance.lastConnectionAt,
      uptime: this.calculateInstanceUptime(instance),
    }));
  }

  private calculateInstanceUptime(instance: any): number {
    if (!instance.lastConnectionAt) return 0;
    const now = Date.now();
    const connected = new Date(instance.lastConnectionAt).getTime();
    const uptimeHours = (now - connected) / (1000 * 60 * 60);
    return Math.round(uptimeHours * 100) / 100;
  }

  private async getAverageResponseTime(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    // Cálculo simplificado del tiempo de respuesta promedio
    // En producción, esto requeriría tracking más detallado
    return 1.2; // segundos
  }

  private async getDetailedMessageReport(tenantId: string, startDate: Date, endDate: Date) {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'message.id',
        'message.content',
        'message.type',
        'message.direction',
        'message.status',
        'message.createdAt',
        'conversation.contactNumber',
        'conversation.contactName',
      ])
      .orderBy('message.createdAt', 'DESC')
      .limit(1000) // Limitar para evitar reportes muy grandes
      .getMany();
  }

  private async getDetailedConversationReport(tenantId: string, startDate: Date, endDate: Date) {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.lastMessageAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'conversation.id',
        'conversation.contactNumber',
        'conversation.contactName',
        'conversation.status',
        'conversation.unreadCount',
        'conversation.lastMessageAt',
        'conversation.createdAt',
      ])
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  private async getInstanceReport(tenantId: string) {
    return this.instanceRepository.find({
      where: { tenantId },
      select: ['id', 'name', 'status', 'phoneNumber', 'lastConnectionAt', 'createdAt'],
    });
  }

  private convertToCSV(data: any): string {
    // Implementación básica de conversión a CSV
    // En producción usar una librería como papa-parse
    const headers = ['Tipo', 'Cantidad', 'Fecha'];
    const rows = [];
    
    // Agregar datos de resumen
    rows.push(['Total Mensajes', data.summary.totalMessages, new Date().toISOString()]);
    rows.push(['Total Conversaciones', data.summary.totalConversations, new Date().toISOString()]);
    rows.push(['Instancias Activas', data.summary.activeInstances, new Date().toISOString()]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}