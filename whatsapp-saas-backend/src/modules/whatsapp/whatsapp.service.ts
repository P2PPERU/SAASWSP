import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppInstance, Conversation, Message } from '../../database/entities';
import { InstanceStatus } from '../../database/entities/whatsapp-instance.entity';
import { ConversationStatus } from '../../database/entities/conversation.entity';
import { MessageType, MessageDirection, MessageStatus } from '../../database/entities/message.entity';
import { EvolutionApiService } from './services/evolution-api.service';
import { CreateInstanceDto, SendMessageDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectRepository(WhatsAppInstance)
    private readonly instanceRepository: Repository<WhatsAppInstance>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly evolutionApiService: EvolutionApiService,
  ) {}

  /**
   * Crear una nueva instancia de WhatsApp
   */
  async createInstance(tenantId: string, createInstanceDto: CreateInstanceDto) {
    // Verificar límites del tenant
    const existingInstances = await this.instanceRepository.count({
      where: { tenantId },
    });

    // TODO: Verificar límites según el plan del tenant
    
    // Generar key única para la instancia
    const instanceKey = `${tenantId}_${uuidv4()}`;

    try {
      // Crear instancia en Evolution API
      const evolutionInstance = await this.evolutionApiService.createInstance(
        instanceKey,
        tenantId,
      );

      // Guardar en base de datos
      const instance = this.instanceRepository.create({
        ...createInstanceDto,
        tenantId,
        instanceKey,
        status: InstanceStatus.DISCONNECTED,
      });

      await this.instanceRepository.save(instance);

      // Configurar webhook (opcional - no fallar si no funciona)
      try {
        const webhookUrl = `${process.env.BACKEND_URL}/api/v1/whatsapp/webhook/${instance.id}`;
        await this.evolutionApiService.setWebhook(instanceKey, webhookUrl);
        this.logger.log(`Webhook configured for instance ${instance.id}`);
      } catch (webhookError) {
        this.logger.warn(`Could not configure webhook: ${webhookError.message}`);
        // No fallar, el webhook se puede configurar manualmente más tarde
      }

      return instance;
    } catch (error) {
      this.logger.error(`Error creating instance: ${error.message}`);
      this.logger.error(`Error response: ${JSON.stringify(error.response?.data || error)}`);
      
      // Proporcionar un mensaje de error más específico
      if (error.response?.status === 404) {
        throw new BadRequestException('Evolution API no está disponible. Verifique que esté corriendo.');
      } else if (error.response?.status === 401) {
        throw new BadRequestException('API Key de Evolution inválida.');
      } else {
        throw new BadRequestException(`Error al crear la instancia: ${error.message}`);
      }
    }
  }

  /**
   * Obtener todas las instancias de un tenant
   */
  async getInstances(tenantId: string) {
    return this.instanceRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener una instancia específica
   */
  async getInstance(tenantId: string, instanceId: string) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, tenantId },
    });

    if (!instance) {
      throw new NotFoundException('Instancia no encontrada');
    }

    return instance;
  }

  /**
   * Conectar una instancia (obtener QR)
   */
  async connectInstance(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      // Primero verificar el estado actual
      const status = await this.evolutionApiService.getInstanceStatus(instance.instanceKey);
      
      if (status.state === 'open') {
        instance.status = InstanceStatus.CONNECTED;
        instance.qrCode = null;
        await this.instanceRepository.save(instance);
        return {
          instance,
          message: 'Ya está conectado',
        };
      }

      // Si no está conectado, obtener QR
      const qrData = await this.evolutionApiService.getQRCode(instance.instanceKey);

      // Actualizar estado y QR en la base de datos
      instance.status = InstanceStatus.CONNECTING;
      instance.qrCode = qrData.qr || qrData.qrcode || qrData.base64;
      await this.instanceRepository.save(instance);

      return {
        instance,
        qrCode: instance.qrCode,
      };
    } catch (error) {
      this.logger.error(`Error connecting instance: ${error.message}`);
      
      // Si el error es 404, posiblemente la instancia necesita ser reconectada
      if (error.response?.status === 404) {
        throw new BadRequestException('La instancia no existe en Evolution API. Puede necesitar ser recreada.');
      }
      
      throw new BadRequestException('Error al conectar la instancia');
    }
  }

  /**
   * Desconectar una instancia
   */
  async disconnectInstance(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      await this.evolutionApiService.disconnectInstance(instance.instanceKey);

      instance.status = InstanceStatus.DISCONNECTED;
      instance.qrCode = null;
      await this.instanceRepository.save(instance);

      return instance;
    } catch (error) {
      this.logger.error(`Error disconnecting instance: ${error.message}`);
      throw new BadRequestException('Error al desconectar la instancia');
    }
  }

  /**
   * Eliminar una instancia
   */
  async deleteInstance(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      // Eliminar de Evolution API
      await this.evolutionApiService.deleteInstance(instance.instanceKey);

      // Soft delete en la base de datos
      await this.instanceRepository.softDelete(instanceId);

      return { message: 'Instancia eliminada correctamente' };
    } catch (error) {
      this.logger.error(`Error deleting instance: ${error.message}`);
      throw new BadRequestException('Error al eliminar la instancia');
    }
  }

  /**
   * Enviar un mensaje
   */
  async sendMessage(tenantId: string, instanceId: string, sendMessageDto: SendMessageDto) {
    const instance = await this.getInstance(tenantId, instanceId);

    if (instance.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException('La instancia no está conectada');
    }

    try {
      // Buscar o crear conversación
      let conversation = await this.conversationRepository.findOne({
        where: {
          instanceId: instanceId,
          contactNumber: sendMessageDto.to,
        },
      });

      if (!conversation) {
        conversation = this.conversationRepository.create({
          instanceId: instanceId,
          contactNumber: sendMessageDto.to,
          contactName: sendMessageDto.to, // Se actualizará cuando recibamos info del contacto
          status: ConversationStatus.ACTIVE,
          unreadCount: 0,
        });
        await this.conversationRepository.save(conversation);
      }

      // Enviar mensaje a través de Evolution API
      const evolutionResponse = await this.evolutionApiService.sendTextMessage(
        instance.instanceKey,
        sendMessageDto.to,
        sendMessageDto.text,
      );

      // Guardar mensaje en la base de datos
      const message = this.messageRepository.create({
        conversationId: conversation.id,
        content: sendMessageDto.text,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
      });

      await this.messageRepository.save(message);

      // Actualizar última actividad de la conversación
      conversation.lastMessageAt = new Date();
      await this.conversationRepository.save(conversation);

      return {
        message,
        evolutionResponse,
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw new BadRequestException('Error al enviar el mensaje');
    }
  }

  /**
   * Procesar webhook de Evolution API
   */
  async processWebhook(instanceId: string, webhookData: any) {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException('Instancia no encontrada');
    }

    const { event, data } = webhookData;

    switch (event) {
      case 'CONNECTION_UPDATE':
        await this.handleConnectionUpdate(instance, data);
        break;
      case 'MESSAGES_UPSERT':
        await this.handleNewMessage(instance, data);
        break;
      case 'QRCODE_UPDATED':
        await this.handleQRCodeUpdate(instance, data);
        break;
      default:
        this.logger.log(`Evento no manejado: ${event}`);
    }
  }

  private async handleConnectionUpdate(instance: WhatsAppInstance, data: any) {
    const { state } = data;
    
    if (state === 'open') {
      instance.status = InstanceStatus.CONNECTED;
      instance.qrCode = null;
      instance.lastConnectionAt = new Date();
    } else if (state === 'close') {
      instance.status = InstanceStatus.DISCONNECTED;
    }

    await this.instanceRepository.save(instance);
  }

  private async handleNewMessage(instance: WhatsAppInstance, data: any) {
    const { key, message } = data;
    
    // Solo procesar mensajes entrantes
    if (key.fromMe) return;

    const contactNumber = key.remoteJid.replace('@s.whatsapp.net', '');

    // Buscar o crear conversación
    let conversation = await this.conversationRepository.findOne({
      where: {
        instanceId: instance.id,
        contactNumber,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        instanceId: instance.id,
        contactNumber,
        contactName: message.pushName || contactNumber,
        status: ConversationStatus.ACTIVE,
        unreadCount: 0,
      });
      await this.conversationRepository.save(conversation);
    }

    // Guardar mensaje
    const newMessage = this.messageRepository.create({
      conversationId: conversation.id,
      content: message.message?.conversation || message.message?.extendedTextMessage?.text || '',
      type: MessageType.TEXT,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.DELIVERED,
    });

    await this.messageRepository.save(newMessage);

    // Actualizar conversación
    conversation.unreadCount += 1;
    conversation.lastMessageAt = new Date();
    await this.conversationRepository.save(conversation);
  }

  private async handleQRCodeUpdate(instance: WhatsAppInstance, data: any) {
    const { qrcode } = data;
    
    instance.qrCode = qrcode;
    instance.status = InstanceStatus.CONNECTING;
    await this.instanceRepository.save(instance);
  }
}