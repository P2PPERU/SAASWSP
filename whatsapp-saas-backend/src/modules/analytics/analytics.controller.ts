// src/modules/analytics/analytics.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Obtener métricas del dashboard
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener métricas principales del dashboard' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas obtenidas exitosamente' 
  })
  async getDashboardMetrics(
    @CurrentUser() user: any,
    @Query('period') period: 'today' | 'week' | 'month' = 'today',
  ) {
    this.logger.log(`Getting dashboard metrics for tenant ${user.tenantId}, period: ${period}`);
    
    const metrics = await this.analyticsService.getDashboardMetrics(
      user.tenantId,
      period
    );

    return {
      message: 'Métricas del dashboard obtenidas exitosamente',
      data: metrics,
    };
  }

  /**
   * Obtener patrones de uso
   */
  @Get('usage-patterns')
  @ApiOperation({ summary: 'Analizar patrones de uso de mensajes' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30 })
  @ApiResponse({ 
    status: 200, 
    description: 'Patrones de uso analizados' 
  })
  async getUsagePatterns(
    @CurrentUser() user: any,
    @Query('days') days: number = 30,
  ) {
    this.logger.log(`Analyzing usage patterns for tenant ${user.tenantId}, last ${days} days`);
    
    const patterns = await this.analyticsService.getUsagePatterns(
      user.tenantId,
      days
    );

    return {
      message: 'Patrones de uso analizados exitosamente',
      data: patterns,
    };
  }

  /**
   * Generar reporte detallado
   */
  @Get('report')
  @ApiOperation({ summary: 'Generar reporte detallado de actividad' })
  @ApiQuery({ name: 'startDate', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, type: String, example: '2024-01-31' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Reporte generado exitosamente' 
  })
  async generateReport(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    this.logger.log(`Generating ${format} report for tenant ${user.tenantId}`);
    
    const report = await this.analyticsService.generateReport(
      user.tenantId,
      new Date(startDate),
      new Date(endDate),
      format
    );

    if (format === 'csv') {
      // Para CSV, podrías configurar headers especiales
      return report;
    }

    return {
      message: 'Reporte generado exitosamente',
      data: report,
    };
  }

  /**
   * Registrar evento personalizado
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un evento personalizado' })
  @ApiResponse({ 
    status: 201, 
    description: 'Evento registrado exitosamente' 
  })
  async trackEvent(
    @CurrentUser() user: any,
    @Body() eventData: {
      type: string;
      instanceId?: string;
      metadata?: any;
    },
  ) {
    this.logger.log(`Tracking custom event ${eventData.type} for tenant ${user.tenantId}`);
    
    await this.analyticsService.trackEvent({
      type: eventData.type as any,
      tenantId: user.tenantId,
      instanceId: eventData.instanceId,
      metadata: eventData.metadata,
    });

    return {
      message: 'Evento registrado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtener resumen ejecutivo
   */
  @Get('summary')
  @ApiOperation({ summary: 'Obtener resumen ejecutivo de métricas clave' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Resumen ejecutivo generado' 
  })
  async getExecutiveSummary(
    @CurrentUser() user: any,
    @Query('period') period: 'today' | 'week' | 'month' = 'week',
  ) {
    this.logger.log(`Getting executive summary for tenant ${user.tenantId}`);
    
    // Combinar varias métricas para un resumen ejecutivo
    const [dashboard, patterns] = await Promise.all([
      this.analyticsService.getDashboardMetrics(user.tenantId, period),
      this.analyticsService.getUsagePatterns(user.tenantId, period === 'today' ? 1 : period === 'week' ? 7 : 30),
    ]);

    // Calcular métricas clave
    const totalMessages = dashboard.messages.total;
    const activeConversations = dashboard.conversations.active;
    const connectedInstances = dashboard.instances.filter((i: any) => i.status === 'connected').length;
    const avgResponseTime = dashboard.performance.averageResponseTime;

    return {
      message: 'Resumen ejecutivo generado',
      data: {
        period,
        kpis: {
          totalMessages,
          activeConversations,
          connectedInstances,
          avgResponseTime,
          uptime: dashboard.performance.uptime,
        },
        trends: {
          messageGrowth: this.calculateGrowth(dashboard.messages.byDate),
          peakHours: patterns.peakHours,
          mostActiveDay: patterns.daily?.[0]?.day || 'N/A',
        },
        recommendations: patterns.recommendation,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Obtener métricas en tiempo real
   */
  @Get('realtime')
  @ApiOperation({ summary: 'Obtener métricas en tiempo real' })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas en tiempo real' 
  })
  async getRealtimeMetrics(@CurrentUser() user: any) {
    this.logger.log(`Getting realtime metrics for tenant ${user.tenantId}`);
    
    const metrics = await this.analyticsService.getDashboardMetrics(
      user.tenantId,
      'today'
    );

    return {
      message: 'Métricas en tiempo real',
      data: {
        current: metrics.realtime,
        instances: metrics.instances.map((i: any) => ({
          id: i.id,
          name: i.name,
          status: i.status,
          uptime: i.uptime,
        })),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Métodos auxiliares privados
   */
  private calculateGrowth(dataByDate: any): number {
    if (!dataByDate || Object.keys(dataByDate).length < 2) {
      return 0;
    }

    const dates = Object.keys(dataByDate).sort();
    const oldValue = dataByDate[dates[0]];
    const newValue = dataByDate[dates[dates.length - 1]];
    
    const totalOld = (oldValue.sent || 0) + (oldValue.received || 0);
    const totalNew = (newValue.sent || 0) + (newValue.received || 0);
    
    if (totalOld === 0) return 100;
    
    return Math.round(((totalNew - totalOld) / totalOld) * 100);
  }
}