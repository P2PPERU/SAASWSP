// src/modules/whatsapp/whatsapp.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  All,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  CreateInstanceDto, 
  SendMessageDto, 
  UpdateInstanceDto,
  BulkMessageDto,
  ScheduleMessageDto 
} from './dto';
import { User } from '../../database/entities';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';
import { WebhookSecurityGuard } from './guards/webhook-security.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Crear una nueva instancia de WhatsApp
   */
  @Post('instances')
  async createInstance(
    @CurrentUser() user: User,
    @Body() createInstanceDto: CreateInstanceDto,
  ) {
    return this.whatsAppService.createInstance(user.tenantId, createInstanceDto);
  }

  /**
   * Obtener todas las instancias del tenant
   */
  @Get('instances')
  async getInstances(@CurrentUser() user: User) {
    return this.whatsAppService.getInstances(user.tenantId);
  }

  /**
   * Obtener una instancia específica
   */
  @Get('instances/:instanceId')
  async getInstance(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.getInstance(user.tenantId, instanceId);
  }

  /**
   * Conectar una instancia (obtener QR)
   */
  @Post('instances/:instanceId/connect')
  async connectInstance(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.connectInstance(user.tenantId, instanceId);
  }

  /**
   * Verificar estado de conexión y obtener QR actualizado
   */
  @Get('instances/:instanceId/connection-status')
  async getConnectionStatus(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.getConnectionStatus(user.tenantId, instanceId);
  }

  /**
   * Desconectar una instancia
   */
  @Post('instances/:instanceId/disconnect')
  async disconnectInstance(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.disconnectInstance(user.tenantId, instanceId);
  }

  /**
   * Eliminar una instancia
   */
  @Delete('instances/:instanceId')
  async deleteInstance(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.deleteInstance(user.tenantId, instanceId);
  }

  /**
   * Enviar un mensaje
   */
  @Post('instances/:instanceId/messages/send')
  async sendMessage(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.whatsAppService.sendMessage(
      user.tenantId,
      instanceId,
      sendMessageDto,
    );
  }

  /**
   * Obtener conversaciones de una instancia
   */
  @Get('instances/:instanceId/conversations')
  async getConversations(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
  ) {
    return this.whatsAppService.getConversations(user.tenantId, instanceId);
  }

  /**
   * Obtener mensajes de una conversación
   */
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.whatsAppService.getMessages(user.tenantId, conversationId);
  }

  /**
   * Webhook principal para recibir eventos de Evolution API
   * Este endpoint es público pero protegido por WebhookSecurityGuard
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
    @Req() request: Request,
  ) {
    // Log inicial del webhook
    this.logger.log(`🔔 Webhook recibido para instancia: ${instanceId}`);
    this.logger.debug(`Headers: ${JSON.stringify(request.headers)}`);
    this.logger.debug(`Body: ${JSON.stringify(webhookData)}`);
    
    // Si el body está vacío pero viene en raw body
    if (!webhookData || Object.keys(webhookData).length === 0) {
      this.logger.warn('Body vacío recibido, verificando raw body...');
      // El body podría estar en request.body si express.json() lo procesó
    }
    
    await this.whatsAppService.processWebhook(instanceId, webhookData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para messages.upsert (cuando webhook_by_events está activo)
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/messages-upsert')
  @HttpCode(HttpStatus.OK)
  async handleMessagesUpsert(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
    @Req() request: Request,
  ) {
    this.logger.log(`🔔 messages.upsert webhook para instancia: ${instanceId}`);
    
    // Crear estructura esperada por processWebhook
    const formattedData = {
      event: 'messages.upsert',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para connection.update
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/connection-update')
  @HttpCode(HttpStatus.OK)
  async handleConnectionUpdate(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 connection.update webhook para instancia: ${instanceId}`);
    
    const formattedData = {
      event: 'connection.update',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para presence.update
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/presence-update')
  @HttpCode(HttpStatus.OK)
  async handlePresenceUpdate(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 presence.update webhook para instancia: ${instanceId}`);
    
    const formattedData = {
      event: 'presence.update',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para qrcode.updated
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/qrcode-updated')
  @HttpCode(HttpStatus.OK)
  async handleQRCodeUpdated(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 qrcode.updated webhook para instancia: ${instanceId}`);
    
    const formattedData = {
      event: 'qrcode.updated',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para chats.update
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/chats-update')
  @HttpCode(HttpStatus.OK)
  async handleChatsUpdate(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 chats.update webhook para instancia: ${instanceId}`);
    
    const formattedData = {
      event: 'chats.update',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook específico para contacts.update
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @Post('webhook/:instanceId/contacts-update')
  @HttpCode(HttpStatus.OK)
  async handleContactsUpdate(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 contacts.update webhook para instancia: ${instanceId}`);
    
    const formattedData = {
      event: 'contacts.update',
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Webhook genérico para cualquier otro evento (catch-all)
   */
  @Public()
  @UseGuards(WebhookSecurityGuard)
  @All('webhook/:instanceId/:eventType')
  @HttpCode(HttpStatus.OK)
  async handleGenericWebhook(
    @Param('instanceId') instanceId: string,
    @Param('eventType') eventType: string,
    @Body() webhookData: any,
  ) {
    this.logger.log(`🔔 ${eventType} webhook para instancia: ${instanceId}`);
    
    // Convertir event-type a event.type
    const eventName = eventType.replace('-', '.');
    
    const formattedData = {
      event: eventName,
      instance: instanceId,
      data: webhookData.data || webhookData
    };
    
    await this.whatsAppService.processWebhook(instanceId, formattedData);
    return { status: 'ok' };
  }

  /**
   * Obtener estado de la cola de mensajes
   */
  @Get('queue/stats')
  async getQueueStats(@CurrentUser() user: User) {
    const stats = await this.whatsAppService.getQueueStats();
    return {
      message: 'Estadísticas de la cola obtenidas',
      data: stats,
    };
  }

  /**
   * Obtener límites de rate limit actuales
   */
  @Get('rate-limit/usage')
  async getRateLimitUsage(@CurrentUser() user: User) {
    const usage = await this.whatsAppService.getRateLimitUsage(user.tenantId);
    return {
      message: 'Uso actual de límites',
      data: usage,
    };
  }

  /**
   * Reintentar mensajes fallidos
   */
  @Post('queue/retry-failed')
  async retryFailedMessages(@CurrentUser() user: User) {
    const result = await this.whatsAppService.retryFailedMessages(user.tenantId);
    return {
      message: 'Mensajes fallidos reintentados',
      data: result,
    };
  }

  /**
   * Enviar mensajes masivos (con rate limiting automático)
   */
  @Post('instances/:instanceId/messages/bulk')
  async sendBulkMessages(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
    @Body() bulkMessageDto: BulkMessageDto,
  ) {
    return this.whatsAppService.sendBulkMessages(
      user.tenantId,
      instanceId,
      bulkMessageDto,
    );
  }

  /**
   * Programar un mensaje para envío futuro
   */
  @Post('instances/:instanceId/messages/schedule')
  async scheduleMessage(
    @CurrentUser() user: User,
    @Param('instanceId') instanceId: string,
    @Body() scheduleDto: ScheduleMessageDto,
  ) {
    return this.whatsAppService.scheduleMessage(
      user.tenantId,
      instanceId,
      scheduleDto,
    );
  }
}