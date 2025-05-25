import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsAppInstance, Conversation, Message } from '../../database/entities';
import { EvolutionApiService } from './services/evolution-api.service';
import { CreateInstanceDto, SendMessageDto, UpdateInstanceDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
// Importar tipos desde el index centralizado
import { 
  InstanceStatus,
  ConversationStatus,
  MessageType,
  MessageDirection,
  MessageStatus,
  MessageUpsertV2,
  ConnectionStateResponse,
  CreateInstanceResponse
} from './types';

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
    private readonly configService: ConfigService,
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
    // if (existingInstances >= tenant.limits.maxInstances) {
    //   throw new BadRequestException('Límite de instancias alcanzado');
    // }
    
    // Generar key única para la instancia
    const instanceKey = `${tenantId.substring(0, 8)}_${uuidv4().substring(0, 8)}`;

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
        settings: {
          ...createInstanceDto.settings,
          evolutionInstance: evolutionInstance.instance,
        },
      });

      const savedInstance = await this.instanceRepository.save(instance);

      // Configurar webhook
      try {
        const webhookUrl = `${this.configService.get('BACKEND_URL')}/api/v1/whatsapp/webhook/${savedInstance.id}`;
        await this.evolutionApiService.setWebhook(instanceKey, webhookUrl);
        this.logger.log(`Webhook configured for instance ${savedInstance.id} at ${webhookUrl}`);
      } catch (webhookError) {
        this.logger.warn(`Could not configure webhook: ${webhookError.message}`);
        // No fallar, el webhook se puede configurar manualmente más tarde
      }

      return {
        message: 'Instancia creada exitosamente',
        data: savedInstance,
      };
    } catch (error) {
      this.logger.error(`Error creating instance: ${error.message}`);
      this.logger.error(`Error response: ${JSON.stringify(error.response?.data || error)}`);
      
      // Proporcionar un mensaje de error más específico
      if (error.response?.status === 404) {
        throw new BadRequestException('Evolution API no está disponible. Verifique que esté corriendo.');
      } else if (error.response?.status === 401) {
        throw new BadRequestException('API Key de Evolution inválida.');
      } else if (error.response?.status === 409) {
        throw new BadRequestException('Ya existe una instancia con ese nombre.');
      } else {
        throw new BadRequestException(`Error al crear la instancia: ${error.message}`);
      }
    }
  }

  /**
   * Obtener todas las instancias de un tenant
   */
  async getInstances(tenantId: string) {
    const instances = await this.instanceRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Instancias obtenidas exitosamente',
      data: instances,
      total: instances.length,
    };
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

    // Obtener estado actualizado de Evolution API
    try {
      const status = await this.evolutionApiService.getInstanceStatus(instance.instanceKey);
      
      // Actualizar estado si cambió
      if (status.instance?.state) {
        const newStatus = status.instance.state === 'open' 
          ? InstanceStatus.CONNECTED 
          : status.instance.state === 'connecting' 
            ? InstanceStatus.CONNECTING 
            : InstanceStatus.DISCONNECTED;
        
        if (instance.status !== newStatus) {
          instance.status = newStatus;
          if (status.instance.profileName) {
            instance.phoneNumber = status.instance.profileName;
          }
          await this.instanceRepository.save(instance);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not fetch instance status from Evolution: ${error.message}`);
    }

    return {
      message: 'Instancia obtenida exitosamente',
      data: instance,
    };
  }

  /**
   * Conectar una instancia (obtener QR)
   */
  async connectInstance(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      // Primero verificar el estado actual
      const status = await this.evolutionApiService.getInstanceStatus(instance.data.instanceKey);
      
      // Evolution v2 retorna: { instance: { state: 'open'|'close' } }
      if (status.instance?.state === 'open') {
        instance.data.status = InstanceStatus.CONNECTED;
        instance.data.qrCode = null;
        instance.data.phoneNumber = status.instance.profileName || instance.data.phoneNumber;
        instance.data.lastConnectionAt = new Date();
        await this.instanceRepository.save(instance.data);
        
        return {
          message: 'Instancia ya está conectada',
          data: {
            instance: instance.data,
            connected: true,
          },
        };
      }

      // Si no está conectado, generar QR
      const qrData = await this.evolutionApiService.connectInstance(instance.data.instanceKey);

      // Evolution v2 retorna el QR en diferentes formatos
      if (qrData.code || qrData.base64 || qrData.qr) {
        instance.data.status = InstanceStatus.CONNECTING;
        instance.data.qrCode = qrData.base64 || qrData.code || qrData.qr;
        await this.instanceRepository.save(instance.data);

        return {
          message: 'Código QR generado exitosamente',
          data: {
            instance: instance.data,
            qrCode: instance.data.qrCode,
            connected: false,
          },
        };
      }

      return {
        message: 'No se pudo generar el código QR',
        data: {
          instance: instance.data,
          connected: false,
        },
      };
    } catch (error) {
      this.logger.error(`Error connecting instance: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new BadRequestException('La instancia no existe en Evolution API. Intente crearla nuevamente.');
      }
      
      throw new BadRequestException(`Error al conectar la instancia: ${error.message}`);
    }
  }
  /**
   * Obtener estado de conexión en tiempo real
   */
  async getConnectionStatus(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      // Obtener estado actual de Evolution API
      const status = await this.evolutionApiService.getInstanceStatus(instance.data.instanceKey);
      
      this.logger.log(`Estado de conexión para ${instance.data.name}: ${JSON.stringify(status)}`);
      
      // Determinar el estado real
      const isConnected = status.instance?.state === 'open';
      const isConnecting = status.instance?.state === 'connecting';
      
      // Actualizar estado en BD si cambió
      const newStatus = isConnected 
        ? InstanceStatus.CONNECTED 
        : isConnecting 
          ? InstanceStatus.CONNECTING 
          : InstanceStatus.DISCONNECTED;
      
      let qrCode = instance.data.qrCode;
      
      // Si está conectado, limpiar QR y actualizar datos del perfil
      if (isConnected) {
        qrCode = null;
        if (status.instance.profileName && instance.data.phoneNumber !== status.instance.profileName) {
          instance.data.phoneNumber = status.instance.profileName;
        }
        if (!instance.data.lastConnectionAt) {
          instance.data.lastConnectionAt = new Date();
        }
      }
      
      // Si el estado cambió, actualizar en BD
      if (instance.data.status !== newStatus || instance.data.qrCode !== qrCode) {
        instance.data.status = newStatus;
        instance.data.qrCode = qrCode;
        await this.instanceRepository.save(instance.data);
      }

      return {
        message: 'Estado de conexión obtenido',
        data: {
          instanceId: instance.data.id,
          instanceKey: instance.data.instanceKey,
          name: instance.data.name,
          status: newStatus,
          connected: isConnected,
          connecting: isConnecting,
          phoneNumber: instance.data.phoneNumber,
          profilePictureUrl: status.instance?.profilePictureUrl,
          lastConnectionAt: instance.data.lastConnectionAt,
          qrCode: qrCode,
          evolutionStatus: status,
        },
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado de conexión: ${error.message}`);
      
      // Si hay error, devolver el estado de la BD
      return {
        message: 'Estado obtenido de caché local',
        data: {
          instanceId: instance.data.id,
          instanceKey: instance.data.instanceKey,
          name: instance.data.name,
          status: instance.data.status,
          connected: instance.data.status === InstanceStatus.CONNECTED,
          connecting: instance.data.status === InstanceStatus.CONNECTING,
          phoneNumber: instance.data.phoneNumber,
          lastConnectionAt: instance.data.lastConnectionAt,
          qrCode: instance.data.qrCode,
          error: error.message,
        },
      };
    }
  }
  /**
   * Desconectar una instancia
   */
  async disconnectInstance(tenantId: string, instanceId: string) {
    const instance = await this.getInstance(tenantId, instanceId);

    try {
      await this.evolutionApiService.disconnectInstance(instance.data.instanceKey);

      instance.data.status = InstanceStatus.DISCONNECTED;
      instance.data.qrCode = null;
      await this.instanceRepository.save(instance.data);

      return {
        message: 'Instancia desconectada exitosamente',
        data: instance.data,
      };
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
      await this.evolutionApiService.deleteInstance(instance.data.instanceKey);
    } catch (error) {
      this.logger.warn(`Could not delete from Evolution API: ${error.message}`);
      // Continuar con la eliminación local
    }

    // Soft delete en la base de datos
    await this.instanceRepository.softDelete(instanceId);

    return { 
      message: 'Instancia eliminada correctamente',
      data: { instanceId },
    };
  }

  /**
   * Actualizar una instancia
   */
  async updateInstance(tenantId: string, instanceId: string, updateDto: UpdateInstanceDto) {
    const instance = await this.getInstance(tenantId, instanceId);

    Object.assign(instance.data, updateDto);
    const updatedInstance = await this.instanceRepository.save(instance.data);

    return {
      message: 'Instancia actualizada exitosamente',
      data: updatedInstance,
    };
  }

  /**
   * Enviar un mensaje
   */
  async sendMessage(tenantId: string, instanceId: string, sendMessageDto: SendMessageDto) {
    const instance = await this.getInstance(tenantId, instanceId);

    if (instance.data.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException('La instancia no está conectada');
    }

    try {
      // Formatear número (asegurar que solo tenga dígitos)
      const cleanNumber = sendMessageDto.to.replace(/\D/g, '');

      // Buscar o crear conversación
      let conversation = await this.conversationRepository.findOne({
        where: {
          instanceId: instanceId,
          contactNumber: cleanNumber,
        },
      });

      if (!conversation) {
        conversation = this.conversationRepository.create({
          instanceId: instanceId,
          contactNumber: cleanNumber,
          contactName: cleanNumber, // Se actualizará cuando recibamos info del contacto
          status: ConversationStatus.ACTIVE,
          unreadCount: 0,
          metadata: {},
        });
        await this.conversationRepository.save(conversation);
      }

      // Enviar mensaje a través de Evolution API
      const evolutionResponse = await this.evolutionApiService.sendTextMessage(
        instance.data.instanceKey,
        cleanNumber,
        sendMessageDto.text,
      );

      // Guardar mensaje en la base de datos
      const message = this.messageRepository.create({
        conversationId: conversation.id,
        content: sendMessageDto.text,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        media: null,
        aiContext: null,
      });

      await this.messageRepository.save(message);

      // Actualizar última actividad de la conversación
      conversation.lastMessageAt = new Date();
      await this.conversationRepository.save(conversation);

      return {
        message: 'Mensaje enviado exitosamente',
        data: {
          message,
          conversation,
          evolutionResponse,
        },
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      
      if (error.response?.data?.message) {
        throw new BadRequestException(`Error al enviar mensaje: ${error.response.data.message}`);
      }
      
      throw new BadRequestException('Error al enviar el mensaje');
    }
  }

  /**
   * Obtener conversaciones de una instancia
   */
  async getConversations(tenantId: string, instanceId: string, status?: ConversationStatus) {
    // Verificar que la instancia pertenece al tenant
    await this.getInstance(tenantId, instanceId);

    const query = this.conversationRepository.createQueryBuilder('conversation')
      .where('conversation.instanceId = :instanceId', { instanceId })
      .orderBy('conversation.lastMessageAt', 'DESC');

    if (status) {
      query.andWhere('conversation.status = :status', { status });
    }

    const conversations = await query.getMany();

    return {
      message: 'Conversaciones obtenidas exitosamente',
      data: conversations,
      total: conversations.length,
    };
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMessages(tenantId: string, conversationId: string, limit = 50, offset = 0) {
    // Verificar que la conversación pertenece al tenant
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['instance'],
    });

    if (!conversation || conversation.instance.tenantId !== tenantId) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Marcar mensajes como leídos
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await this.conversationRepository.save(conversation);
    }

    return {
      message: 'Mensajes obtenidos exitosamente',
      data: messages.reverse(), // Orden cronológico
      total: messages.length,
      conversation,
    };
  }

  /**
   * Procesar webhook de Evolution API v2
   */
  async processWebhook(instanceId: string, webhookData: any) {
    // Evolution v2 envía los eventos con esta estructura:
    // { event: 'EVENT_NAME', instance: 'instanceName', data: {...} }
    
    const { event, instance: instanceName, data } = webhookData;

    // Buscar la instancia por instanceKey
    const instance = await this.instanceRepository.findOne({
      where: { instanceKey: instanceName },
    });

    if (!instance) {
      this.logger.warn(`Instancia no encontrada para webhook: ${instanceName}`);
      return;
    }

    this.logger.log(`Procesando evento ${event} para instancia ${instance.id}`);

    try {
      switch (event) {
        case 'connection.update':
          await this.handleConnectionUpdate(instance, data);
          break;
        case 'messages.upsert':
          await this.handleNewMessage(instance, data);
          break;
        case 'qrcode.updated':
          await this.handleQRCodeUpdate(instance, data);
          break;
        case 'messages.update':
          await this.handleMessageUpdate(instance, data);
          break;
        case 'messages.delete':
          await this.handleMessageDelete(instance, data);
          break;
        case 'presence.update':
          await this.handlePresenceUpdate(instance, data);
          break;
        default:
          this.logger.log(`Evento no manejado: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Error procesando webhook ${event}: ${error.message}`);
    }
  }

  /**
   * Manejar actualización de conexión
   */
  private async handleConnectionUpdate(instance: WhatsAppInstance, data: any) {
    // Evolution v2 envía: { state: 'open' | 'connecting' | 'close' }
    const { state } = data;
    
    if (state === 'open') {
      instance.status = InstanceStatus.CONNECTED;
      instance.qrCode = null;
      instance.lastConnectionAt = new Date();
      this.logger.log(`Instancia ${instance.name} conectada`);
    } else if (state === 'close') {
      instance.status = InstanceStatus.DISCONNECTED;
      this.logger.log(`Instancia ${instance.name} desconectada`);
    } else if (state === 'connecting') {
      instance.status = InstanceStatus.CONNECTING;
      this.logger.log(`Instancia ${instance.name} conectando...`);
    }

    await this.instanceRepository.save(instance);
  }

  /**
   * Manejar nuevo mensaje
   */
  private async handleNewMessage(instance: WhatsAppInstance, data: any) {
    // Evolution v2 estructura del mensaje
    const messages = Array.isArray(data) ? data : [data];
    
    for (const messageData of messages) {
      try {
        const { key, message: msgContent, pushName, messageTimestamp } = messageData;
        
        // Solo procesar mensajes entrantes
        if (key.fromMe) continue;

        const contactNumber = key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

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
            contactName: pushName || contactNumber,
            status: ConversationStatus.ACTIVE,
            unreadCount: 0,
            metadata: {},
          });
          await this.conversationRepository.save(conversation);
        }

        // Extraer el contenido del mensaje según el tipo
        let messageText = '';
        let messageType = MessageType.TEXT;
        let mediaInfo = null;

        if (msgContent.conversation) {
          messageText = msgContent.conversation;
        } else if (msgContent.extendedTextMessage?.text) {
          messageText = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          messageText = msgContent.imageMessage.caption || '[Imagen]';
          messageType = MessageType.IMAGE;
          mediaInfo = {
            mimetype: msgContent.imageMessage.mimetype,
            url: msgContent.imageMessage.url,
          };
        } else if (msgContent.audioMessage) {
          messageText = '[Audio]';
          messageType = MessageType.AUDIO;
          mediaInfo = {
            mimetype: msgContent.audioMessage.mimetype,
            seconds: msgContent.audioMessage.seconds,
            ptt: msgContent.audioMessage.ptt,
          };
        } else if (msgContent.videoMessage) {
          messageText = msgContent.videoMessage.caption || '[Video]';
          messageType = MessageType.VIDEO;
          mediaInfo = {
            mimetype: msgContent.videoMessage.mimetype,
            seconds: msgContent.videoMessage.seconds,
          };
        } else if (msgContent.documentMessage) {
          messageText = msgContent.documentMessage.fileName || '[Documento]';
          messageType = MessageType.DOCUMENT;
          mediaInfo = {
            mimetype: msgContent.documentMessage.mimetype,
            fileName: msgContent.documentMessage.fileName,
          };
        } else if (msgContent.locationMessage) {
          messageText = msgContent.locationMessage.name || '[Ubicación]';
          messageType = MessageType.LOCATION;
          mediaInfo = {
            latitude: msgContent.locationMessage.degreesLatitude,
            longitude: msgContent.locationMessage.degreesLongitude,
            address: msgContent.locationMessage.address,
          };
        }

        // Guardar mensaje
        const newMessage = this.messageRepository.create({
          conversationId: conversation.id,
          content: messageText,
          type: messageType,
          direction: MessageDirection.INBOUND,
          status: MessageStatus.DELIVERED,
          media: mediaInfo,
          aiContext: {},
          createdAt: new Date(parseInt(messageTimestamp) * 1000),
        });

        await this.messageRepository.save(newMessage);

        // Actualizar conversación
        conversation.unreadCount += 1;
        conversation.lastMessageAt = new Date();
        if (pushName && conversation.contactName !== pushName) {
          conversation.contactName = pushName;
        }
        await this.conversationRepository.save(conversation);

        this.logger.log(`Nuevo mensaje de ${contactNumber}: ${messageText.substring(0, 50)}...`);
        
        // TODO: Aquí puedes emitir un evento o notificar a través de WebSocket
      } catch (error) {
        this.logger.error(`Error procesando mensaje: ${error.message}`);
      }
    }
  }

  /**
   * Manejar actualización de QR Code
   */
  private async handleQRCodeUpdate(instance: WhatsAppInstance, data: any) {
    // Evolution v2 envía el QR directamente
    const { qr, base64 } = data;
    
    instance.qrCode = base64 || qr;
    instance.status = InstanceStatus.CONNECTING;
    await this.instanceRepository.save(instance);
    
    this.logger.log(`QR Code actualizado para instancia ${instance.name}`);
  }

  /**
   * Manejar actualización de estado de mensaje
   */
  private async handleMessageUpdate(instance: WhatsAppInstance, data: any) {
    // Manejar actualizaciones de estado de mensajes (delivered, read, etc)
    const updates = Array.isArray(data) ? data : [data];
    
    for (const update of updates) {
      if (update.update?.status) {
        this.logger.log(`Actualización de estado de mensaje: ${update.update.status}`);
        // TODO: Actualizar el estado del mensaje en la BD si es necesario
      }
    }
  }

  /**
   * Manejar eliminación de mensaje
   */
  private async handleMessageDelete(instance: WhatsAppInstance, data: any) {
    this.logger.log(`Mensaje eliminado en instancia ${instance.name}`);
    // TODO: Implementar lógica para marcar mensaje como eliminado
  }

  /**
   * Manejar actualización de presencia
   */
  private async handlePresenceUpdate(instance: WhatsAppInstance, data: any) {
    // Log para debugging, pero generalmente no necesitas hacer nada con esto
    this.logger.debug(`Actualización de presencia en instancia ${instance.name}`);
  }
}