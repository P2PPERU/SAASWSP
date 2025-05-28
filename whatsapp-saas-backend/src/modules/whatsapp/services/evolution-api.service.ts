// src/modules/whatsapp/services/evolution-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { 
  CreateInstanceResponse,
  ConnectionStateResponse,
  SendMessageResponse,
  WebhookConfig,
  FetchInstancesResponse 
} from '../types/evolution-v2.types';

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly apiUrl: string;
  private readonly globalApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    this.globalApiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'B6D711FCDE4D4FD5936544120E713976');
  }

  /**
   * Obtener la API Key a usar (específica de instancia o global)
   */
  private getApiKey(instanceApiKey?: string): string {
    return instanceApiKey || this.globalApiKey;
  }

  /**
   * Crear una nueva instancia de WhatsApp
   * NOTA: Para crear instancias siempre usa la API Key global
   */
  async createInstance(instanceName: string, tenantId: string): Promise<CreateInstanceResponse> {
    try {
      this.logger.log(`Creating instance: ${instanceName} for tenant: ${tenantId}`);

      const response = await firstValueFrom(
        this.httpService.post<CreateInstanceResponse>(
          `${this.apiUrl}/instance/create`,
          {
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            // Opcional: webhook automático
            webhook: {
              url: `${this.configService.get('BACKEND_URL', 'http://localhost:3000')}/api/v1/whatsapp/webhook/${instanceName}`,
              webhook_by_events: false,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'MESSAGES_SET',
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'MESSAGES_DELETE',
                'SEND_MESSAGE',
                'CONNECTION_UPDATE',
              ],
            },
          },
          {
            headers: {
              'apikey': this.globalApiKey, // Usar API Key global para crear
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Instance created successfully: ${instanceName}`);
      
      // CAMBIO: Log del hash directamente (es un string)
      this.logger.log(`Instance API Key (hash): ${response.data.hash}`);
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating instance: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`Response status: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Obtener todas las instancias
   */
  async fetchInstances(instanceApiKey?: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/fetchInstances`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching instances: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener el estado de conexión de una instancia
   */
  async getInstanceStatus(instanceName: string, instanceApiKey?: string): Promise<ConnectionStateResponse> {
    try {
      const apiKeyToUse = this.getApiKey(instanceApiKey);
      
      // Log para debugging
      this.logger.debug(`🔑 Getting status for ${instanceName} with API Key: ${apiKeyToUse?.substring(0, 10)}...`);
      
      const response = await firstValueFrom(
        this.httpService.get<ConnectionStateResponse>(
          `${this.apiUrl}/instance/connectionState/${instanceName}`,
          {
            headers: {
              'apikey': apiKeyToUse,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting instance status: ${error.message}`);
      
      // Más detalles del error si es 401
      if (error.response?.status === 401) {
        this.logger.error(`❌ API Key inválida o instancia no existe: ${instanceName}`);
        this.logger.error(`API Key usada: ${this.getApiKey(instanceApiKey)?.substring(0, 10)}...`);
      }
      
      throw error;
    }
  }

  /**
   * Conectar una instancia (generar QR Code)
   */
  async connectInstance(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/connect/${instanceName}`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      this.logger.log(`QR Code generated for instance: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error connecting instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener el código QR actual
   */
  async getQRCode(instanceName: string, instanceApiKey?: string) {
    try {
      const connectionState = await this.getInstanceStatus(instanceName, instanceApiKey);
      
      // Solo 'open' significa conectado completamente
      if (connectionState.instance?.state === 'open') {
        return { connected: true, qrcode: null };
      }
      
      // Para 'connecting' o 'close', necesitamos obtener el QR
      const connectResponse = await this.connectInstance(instanceName, instanceApiKey);
      return {
        connected: false,
        qrcode: connectResponse.qr || connectResponse.base64 || connectResponse.code
      };
    } catch (error) {
      this.logger.error(`Error getting QR code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desconectar una instancia
   */
  async disconnectInstance(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/logout/${instanceName}`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      this.logger.log(`Instance disconnected: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error disconnecting instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar una instancia
   */
  async deleteInstance(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/delete/${instanceName}`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      this.logger.log(`Instance deleted: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error deleting instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar un mensaje de texto
   */
  async sendTextMessage(instanceName: string, to: string, text: string, instanceApiKey?: string): Promise<SendMessageResponse> {
    try {
      // Asegurar que el número tenga el formato correcto
      const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      const response = await firstValueFrom(
        this.httpService.post<SendMessageResponse>(
          `${this.apiUrl}/message/sendText/${instanceName}`,
          {
            number: formattedNumber,
            text: text,
            delay: 1200, // Delay opcional en ms
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Message sent to ${to} via instance ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Configurar webhook para recibir eventos
   */
  async setWebhook(instanceName: string, webhookUrl: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/webhook/set/${instanceName}`,
          {
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhook_by_events: false,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'MESSAGES_SET',
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'MESSAGES_DELETE',
                'SEND_MESSAGE',
                'CONNECTION_UPDATE',
                'PRESENCE_UPDATE',
                'GROUPS_UPSERT',
                'GROUPS_UPDATE',
                'GROUP_PARTICIPANTS_UPDATE',
                'NEW_JWT_TOKEN',
              ],
            },
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Webhook configured for instance: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error setting webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar instancia por nombre
   */
  async findInstance(instanceName: string, instanceApiKey?: string) {
    try {
      const instances = await this.fetchInstances(instanceApiKey);
      return instances.find((inst: any) => 
        inst.instance?.instanceName === instanceName || 
        inst.instanceName === instanceName
      );
    } catch (error) {
      this.logger.error(`Error finding instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reiniciar una instancia
   */
  async restartInstance(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/instance/restart/${instanceName}`,
          {},
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      this.logger.log(`Instance restarted: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error restarting instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener información del perfil
   */
  async getProfileInfo(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/chat/fetchProfile/${instanceName}`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting profile info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar si un número está en WhatsApp
   */
  async checkNumberExists(instanceName: string, number: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/chat/whatsappNumbers/${instanceName}`,
          {
            numbers: [number],
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error checking number: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensaje con media (imagen, video, etc)
   */
  async sendMediaMessage(
    instanceName: string, 
    to: string, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    instanceApiKey?: string
  ) {
    try {
      const formattedNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const endpoint = `${this.apiUrl}/message/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}/${instanceName}`;

      const response = await firstValueFrom(
        this.httpService.post(
          endpoint,
          {
            number: formattedNumber,
            mediaUrl: mediaUrl,
            caption: caption,
            delay: 1200,
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`${mediaType} message sent to ${to} via instance ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending ${mediaType} message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener chats/conversaciones
   */
  async fetchChats(instanceName: string, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/chat/fetchAllChats/${instanceName}`,
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching chats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener mensajes de un chat
   */
  async fetchMessages(instanceName: string, remoteJid: string, limit: number = 50, instanceApiKey?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/chat/fetchMessages/${instanceName}`,
          {
            remoteJid: remoteJid,
            limit: limit,
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching messages: ${error.message}`);
      throw error;
    }
  }
}