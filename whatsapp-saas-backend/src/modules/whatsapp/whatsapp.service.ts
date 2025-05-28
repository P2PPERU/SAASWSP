import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsAppInstance, Conversation, Message, Tenant } from '../../database/entities';
import { EvolutionApiService } from './services/evolution-api.service';
import { MessageQueueService } from './services/message-queue.service';
import { RateLimitService } from './services/rate-limit.service';
import { TenantService } from '../tenant/tenant.service';
import { CreateInstanceDto, SendMessageDto, UpdateInstanceDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import { AICoreService } from '../ai/services/ai-core.service';
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
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly messageQueueService: MessageQueueService,
    private readonly rateLimitService: RateLimitService,
    private readonly tenantService: TenantService,
    private readonly configService: ConfigService,
    private readonly aiCoreService: AICoreService,
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

      // ⬇️ CAMBIO IMPORTANTE: El API Key está en 'hash' directamente ⬇️
      const apiKey = evolutionInstance.hash;
      
      this.logger.log(`API Key recibida: ${apiKey}`);

      // ⬇️ IMPORTANTE: Guardar la API Key única de la instancia ⬇️
      const instance = this.instanceRepository.create({
        ...createInstanceDto,
        tenantId,
        instanceKey,
        apiKey: apiKey, // <-- USAR LA VARIABLE apiKey
        status: InstanceStatus.DISCONNECTED,
        settings: {
          ...createInstanceDto.settings,
          evolutionInstance: evolutionInstance.instance,
        },
      });

      const savedInstance = await this.instanceRepository.save(instance);
      
      this.logger.log(`Instancia creada con API Key única: ${savedInstance.apiKey?.substring(0, 10)}...`);

      // Configurar webhook
      try {
        const webhookUrl = `${this.configService.get('BACKEND_URL')}/api/v1/whatsapp/webhook/${savedInstance.id}`;
        await this.evolutionApiService.setWebhook(
          instanceKey, 
          webhookUrl,
          savedInstance.apiKey // <-- USAR LA API KEY ESPECÍFICA
        );
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
      const status = await this.evolutionApiService.getInstanceStatus(
        instance.instanceKey,
        instance.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );
      
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
      const status = await this.evolutionApiService.getInstanceStatus(
        instance.data.instanceKey,
        instance.data.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );
      
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
      const qrData = await this.evolutionApiService.connectInstance(
        instance.data.instanceKey,
        instance.data.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );

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
      const status = await this.evolutionApiService.getInstanceStatus(
        instance.data.instanceKey,
        instance.data.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );
      
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
      await this.evolutionApiService.disconnectInstance(
        instance.data.instanceKey,
        instance.data.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );

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
      await this.evolutionApiService.deleteInstance(
        instance.data.instanceKey,
        instance.data.apiKey // <-- PASAR LA API KEY ESPECÍFICA
      );
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
   * Enviar un mensaje (con cola y rate limiting)
   */
  async sendMessage(tenantId: string, instanceId: string, sendMessageDto: SendMessageDto) {
    const instance = await this.getInstance(tenantId, instanceId);

    if (instance.data.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException('La instancia no está conectada');
    }

    // 1. Obtener el tenant para verificar el plan
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // 2. Verificar rate limit
    const rateLimitCheck = await this.rateLimitService.canSendMessage(tenantId, tenant.plan);
    
    if (!rateLimitCheck.allowed) {
      throw new BadRequestException({
        message: rateLimitCheck.reason,
        retryAfter: rateLimitCheck.retryAfter,
        limits: rateLimitCheck.limits,
      });
    }

    // 3. Verificar límite mensual del plan
    const usageStats = await this.tenantService.getUsageStats(tenantId);
    if (usageStats.usage.messages.current >= usageStats.usage.messages.limit) {
      throw new BadRequestException('Límite de mensajes del plan alcanzado');
    }

    try {
      // 4. Formatear número (asegurar que solo tenga dígitos)
      const cleanNumber = sendMessageDto.to.replace(/\D/g, '');

      // 5. Buscar o crear conversación
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

      // 6. Guardar mensaje en la base de datos con estado PENDING
      const message = this.messageRepository.create({
        conversationId: conversation.id,
        content: sendMessageDto.text,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.PENDING,
        media: null,
        aiContext: null,
      });

      const savedMessage = await this.messageRepository.save(message);

      // 7. Agregar a la cola de mensajes para procesamiento asíncrono
      const job = await this.messageQueueService.queueMessage({
        instanceId: instance.data.id,
        to: cleanNumber,
        text: sendMessageDto.text,
        messageId: savedMessage.id,
        priority: tenant.plan === 'enterprise' ? 1 : 0, // Mayor prioridad para enterprise
      });

      // 8. Actualizar última actividad de la conversación
      conversation.lastMessageAt = new Date();
      await this.conversationRepository.save(conversation);

      this.logger.log(`Mensaje ${savedMessage.id} agregado a la cola para envío`);

      return {
        message: 'Mensaje agregado a la cola de envío',
        data: {
          message: savedMessage,
          conversation,
          job: {
            id: job.id,
            status: 'queued'
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error queueing message: ${error.message}`);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Error al procesar el mensaje');
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
   * Manejar nuevo mensaje - CON IA
   */
  private async handleNewMessage(instance: WhatsAppInstance, data: any) {
    // Evolution v2 estructura del mensaje
    const messages = Array.isArray(data) ? data : [data];
    
    for (const messageData of messages) {
      try {
        const { key, message: msgContent, pushName, messageTimestamp } = messageData;
        
        // IMPORTANTE: Solo procesar mensajes ENTRANTES (no fromMe)
        if (key.fromMe) {
          this.logger.log(`Ignorando mensaje saliente: ${key.id}`);
          continue;
        }

        const contactNumber = key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            
        // Ignorar mensajes de grupos
        if (key.remoteJid.includes('@g.us') || contactNumber.includes('-')) {
          this.logger.log('Ignorando mensaje de grupo');
          continue;
        }

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

        this.logger.log(`📩 Nuevo mensaje ENTRANTE de ${contactNumber}: ${messageText.substring(0, 50)}...`);
        
        // ===== INTEGRACIÓN CON IA =====
        // Solo procesar mensajes de texto para IA (por ahora)
        if (messageType === MessageType.TEXT && messageText && messageText.trim().length > 0) {
          try {
            // Verificar si la IA debe responder
            const shouldRespond = await this.aiCoreService.shouldRespond(
              messageText,
              conversation.id,
              instance.tenantId
            );

            if (shouldRespond) {
              this.logger.log(`🤖 IA activada para responder a ${contactNumber}`);
              
              // Generar respuesta con IA
              const aiResponse = await this.aiCoreService.generateResponse(
                messageText,
                conversation.id,
                instance.tenantId
              );

              if (aiResponse) {
                // Obtener el tenant para el rate limiting
                const tenant = await this.tenantRepository.findOne({
                  where: { id: instance.tenantId }
                });

                if (!tenant) {
                  this.logger.error('Tenant no encontrado para respuesta de IA');
                  continue;
                }

                // Verificar rate limit antes de enviar
                const rateLimitCheck = await this.rateLimitService.canSendMessage(
                  instance.tenantId, 
                  tenant.plan
                );

                if (rateLimitCheck.allowed) {
                  // Guardar la respuesta de IA en la BD
                  const aiMessage = this.messageRepository.create({
                    conversationId: conversation.id,
                    content: aiResponse,
                    type: MessageType.TEXT,
                    direction: MessageDirection.OUTBOUND,
                    status: MessageStatus.PENDING,
                    media: null,
                    aiContext: {
                      generatedByAI: true,
                      model: 'gpt-3.5-turbo',
                      timestamp: new Date().toISOString(),
                      originalMessage: messageText,
                      responseToMessageId: newMessage.id,
                    },
                  });

                  const savedAIMessage = await this.messageRepository.save(aiMessage);

                  // Enviar respuesta a través de la cola de mensajes
                  await this.messageQueueService.queueMessage({
                    instanceId: instance.id,
                    to: contactNumber,
                    text: aiResponse,
                    messageId: savedAIMessage.id,
                    priority: 1, // Alta prioridad para respuestas de IA
                  });

                  this.logger.log(`✅ Respuesta de IA encolada para ${contactNumber}`);
                  
                  // Actualizar conversación
                  conversation.lastMessageAt = new Date();
                  await this.conversationRepository.save(conversation);
                  
                } else {
                  this.logger.warn(`⚠️ Rate limit excedido, no se puede enviar respuesta de IA`);
                }
              } else {
                this.logger.log('ℹ️ IA no generó respuesta para este mensaje');
              }
            } else {
              this.logger.log('ℹ️ IA configurada para no responder en este momento');
            }
          } catch (aiError) {
            this.logger.error(`❌ Error en procesamiento de IA: ${aiError.message}`);
            // No fallar el procesamiento del mensaje si la IA falla
          }
        }
        // ===== FIN INTEGRACIÓN CON IA =====
        
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

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats() {
    return this.messageQueueService.getQueueStats();
  }

  /**
   * Obtener uso de rate limit
   */
  async getRateLimitUsage(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return this.rateLimitService.getCurrentUsage(tenantId, tenant.plan);
  }

  /**
   * Reintentar mensajes fallidos del tenant
   */
  async retryFailedMessages(tenantId: string) {
    // Por ahora reintenta todos, en el futuro filtrar por tenant
    const retriedCount = await this.messageQueueService.retryFailedMessages();
    
    return {
      retriedMessages: retriedCount,
      message: `${retriedCount} mensajes reintentados`,
    };
  }

  /**
   * Enviar mensajes masivos
   */
  async sendBulkMessages(
    tenantId: string, 
    instanceId: string, 
    bulkMessageDto: {
      recipients: string[];
      text: string;
      delayBetweenMessages?: number;
    }
  ) {
    // Verificar instancia
    const instance = await this.getInstance(tenantId, instanceId);
    
    if (instance.data.status !== InstanceStatus.CONNECTED) {
      throw new BadRequestException('La instancia no está conectada');
    }

    // Verificar límites
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Limpiar números
    const cleanRecipients = bulkMessageDto.recipients.map(num => num.replace(/\D/g, ''));

    // Verificar que no exceda el límite diario
    const rateLimitCheck = await this.rateLimitService.canSendMessage(tenantId, tenant.plan);
    if (!rateLimitCheck.allowed) {
      throw new BadRequestException({
        message: 'Límite de mensajes excedido. Intenta más tarde.',
        retryAfter: rateLimitCheck.retryAfter,
      });
    }

    // Agregar a la cola con delay entre mensajes
    const result = await this.messageQueueService.queueBulkMessages({
      instanceId: instance.data.id,
      recipients: cleanRecipients,
      text: bulkMessageDto.text,
      delayBetweenMessages: bulkMessageDto.delayBetweenMessages || 3000,
    });

    return {
      message: 'Mensajes masivos agregados a la cola',
      data: result,
    };
  }

  /**
   * Programar mensaje
   */
  async scheduleMessage(
    tenantId: string,
    instanceId: string,
    scheduleDto: {
      to: string;
      text: string;
      sendAt: string;
    }
  ) {
    // Verificar instancia
    const instance = await this.getInstance(tenantId, instanceId);

    // Verificar fecha
    const sendAt = new Date(scheduleDto.sendAt);
    if (sendAt <= new Date()) {
      throw new BadRequestException('La fecha de envío debe ser futura');
    }

    // Limpiar número
    const cleanNumber = scheduleDto.to.replace(/\D/g, '');

    // Crear conversación si no existe
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
        contactName: cleanNumber,
        status: ConversationStatus.ACTIVE,
        unreadCount: 0,
        metadata: {},
      });
      await this.conversationRepository.save(conversation);
    }

    // Programar mensaje
    const job = await this.messageQueueService.scheduleMessage({
      instanceId: instance.data.id,
      to: cleanNumber,
      text: scheduleDto.text,
      sendAt,
    });

    return {
      message: 'Mensaje programado exitosamente',
      data: {
        jobId: job.id,
        scheduledFor: sendAt,
        to: cleanNumber,
      },
    };
  }
}