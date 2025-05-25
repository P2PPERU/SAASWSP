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
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateInstanceDto, SendMessageDto, UpdateInstanceDto } from './dto';
import { User } from '../../database/entities';
import { Public } from '../auth/decorators/public.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
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
    // TODO: Implementar en el servicio
    return { message: 'Endpoint pendiente de implementación' };
  }

  /**
   * Obtener mensajes de una conversación
   */
  @Get('conversations/:conversationId/messages')
  async getMessages(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    // TODO: Implementar en el servicio
    return { message: 'Endpoint pendiente de implementación' };
  }

  /**
   * Webhook para recibir eventos de Evolution API
   * Este endpoint es público porque Evolution API necesita acceder a él
   */
  @Public()
  @Post('webhook/:instanceId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('instanceId') instanceId: string,
    @Body() webhookData: any,
  ) {
    await this.whatsAppService.processWebhook(instanceId, webhookData);
    return { status: 'ok' };
  }
}