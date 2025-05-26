// Configuraci�n por tenant
// src/modules/ai/controllers/ai-config.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AIConfigService } from '../services/ai-config.service';
import {
  UpdateAIConfigDto,
  ToggleAIDto,
  AIConfigResponseDto,
  AIStatsResponseDto,
  TestPromptDto,
  TestPromptResponseDto,
  IndustryTemplateDto,
} from '../dto/ai-config.dto';

@ApiTags('AI Configuration')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIConfigController {
  private readonly logger = new Logger(AIConfigController.name);

  constructor(private readonly aiConfigService: AIConfigService) {}

  /**
   * Obtener configuración actual de IA
   */
  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración actual de IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración obtenida exitosamente',
    type: AIConfigResponseDto 
  })
  async getConfig(@CurrentUser() user: any): Promise<AIConfigResponseDto> {
    this.logger.log(`Getting AI config for tenant ${user.tenantId}`);
    return this.aiConfigService.getConfig(user.tenantId);
  }

  /**
   * Actualizar configuración de IA
   */
  @Put('config')
  @ApiOperation({ summary: 'Actualizar configuración de IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración actualizada exitosamente',
    type: AIConfigResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateConfig(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateAIConfigDto
  ): Promise<AIConfigResponseDto> {
    this.logger.log(`Updating AI config for tenant ${user.tenantId}`);
    return this.aiConfigService.updateConfig(user.tenantId, updateDto);
  }

  /**
   * Activar/Desactivar IA rápidamente
   */
  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar o desactivar IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado de IA actualizado',
    schema: {
      properties: {
        enabled: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async toggleAI(
    @CurrentUser() user: any,
    @Body() toggleDto: ToggleAIDto
  ) {
    this.logger.log(`Toggling AI for tenant ${user.tenantId} to ${toggleDto.enabled}`);
    const result = await this.aiConfigService.toggleAI(user.tenantId, toggleDto.enabled);
    
    return {
      enabled: result.enabled,
      message: result.enabled ? 'IA activada exitosamente' : 'IA desactivada exitosamente',
    };
  }

  /**
   * Obtener estadísticas de uso de IA
   */
  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de uso de IA' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas obtenidas exitosamente',
    type: AIStatsResponseDto 
  })
  async getStats(
    @CurrentUser() user: any,
    @Query('period') period: 'today' | 'week' | 'month' = 'week'
  ): Promise<AIStatsResponseDto> {
    this.logger.log(`Getting AI stats for tenant ${user.tenantId}, period: ${period}`);
    return this.aiConfigService.getStats(user.tenantId, period);
  }

  /**
   * Probar configuración con un mensaje
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Probar respuesta de IA con configuración actual' })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuesta de prueba generada',
    type: TestPromptResponseDto 
  })
  async testPrompt(
    @CurrentUser() user: any,
    @Body() testDto: TestPromptDto
  ): Promise<TestPromptResponseDto> {
    this.logger.log(`Testing AI prompt for tenant ${user.tenantId}`);
    return this.aiConfigService.testPrompt(user.tenantId, testDto);
  }

  /**
   * Resetear uso de tokens (admin only)
   */
  @Post('reset-usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contadores de uso' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contadores reseteados exitosamente' 
  })
  async resetUsage(@CurrentUser() user: any) {
    this.logger.log(`Resetting AI usage for tenant ${user.tenantId}`);
    await this.aiConfigService.resetUsage(user.tenantId);
    
    return {
      message: 'Contadores de uso reseteados exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtener plantillas por industria
   */
  @Get('templates')
  @ApiOperation({ summary: 'Obtener plantillas de configuración por industria' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plantillas disponibles',
    type: [IndustryTemplateDto] 
  })
  async getTemplates(): Promise<IndustryTemplateDto[]> {
    return this.aiConfigService.getIndustryTemplates();
  }

  /**
   * Aplicar plantilla de industria
   */
  @Post('templates/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar plantilla de industria' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plantilla aplicada exitosamente',
    type: AIConfigResponseDto 
  })
  async applyTemplate(
    @CurrentUser() user: any,
    @Body('industry') industry: string
  ): Promise<AIConfigResponseDto> {
    if (!industry) {
      throw new BadRequestException('Debe especificar una industria');
    }
    
    this.logger.log(`Applying ${industry} template for tenant ${user.tenantId}`);
    return this.aiConfigService.applyIndustryTemplate(user.tenantId, industry);
  }

  /**
   * Obtener respuestas personalizadas
   */
  @Get('custom-responses')
  @ApiOperation({ summary: 'Obtener respuestas personalizadas configuradas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuestas personalizadas',
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  })
  async getCustomResponses(@CurrentUser() user: any) {
    const config = await this.aiConfigService.getConfig(user.tenantId);
    return config.customResponses || {};
  }

  /**
   * Actualizar respuestas personalizadas
   */
  @Put('custom-responses')
  @ApiOperation({ summary: 'Actualizar respuestas personalizadas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuestas actualizadas exitosamente' 
  })
  async updateCustomResponses(
    @CurrentUser() user: any,
    @Body() customResponses: Record<string, string>
  ) {
    await this.aiConfigService.updateConfig(user.tenantId, { customResponses });
    
    return {
      message: 'Respuestas personalizadas actualizadas',
      count: Object.keys(customResponses).length,
    };
  }

  /**
   * Verificar salud del servicio de IA
   */
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servicio de IA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del servicio',
    schema: {
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        openai: { 
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            model: { type: 'string' }
          }
        },
        database: { 
          type: 'object',
          properties: {
            connected: { type: 'boolean' },
            profileExists: { type: 'boolean' }
          }
        }
      }
    }
  })
  async checkHealth(@CurrentUser() user: any) {
    return this.aiConfigService.checkHealth(user.tenantId);
  }

  /**
   * Obtener historial de cambios de configuración
   */
  @Get('config/history')
  @ApiOperation({ summary: 'Obtener historial de cambios de configuración' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Historial de cambios',
    schema: {
      type: 'array',
      items: {
        properties: {
          timestamp: { type: 'string' },
          changes: { type: 'object' },
          changedBy: { type: 'string' }
        }
      }
    }
  })
  async getConfigHistory(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 10
  ) {
    // Por ahora retornamos un placeholder
    // En el futuro, esto vendría de una tabla de auditoría
    return {
      message: 'Historial de configuración',
      history: [
        {
          timestamp: new Date().toISOString(),
          changes: { enabled: true },
          changedBy: user.email,
        }
      ],
      total: 1,
    };
  }
}