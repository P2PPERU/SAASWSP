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
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('EVOLUTION_API_URL', 'http://localhost:8080');
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY', 'B6D711FCDE4D4FD5936544120E713976');
  }

  /**
   * Crear una nueva instancia de WhatsApp
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
              'apikey': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Instance created successfully: ${instanceName}`);
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
  async fetchInstances() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/fetchInstances`,
          {
            headers: {
              'apikey': this.apiKey,
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
  async getInstanceStatus(instanceName: string): Promise<ConnectionStateResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ConnectionStateResponse>(
          `${this.apiUrl}/instance/connectionState/${instanceName}`,
          {
            headers: {
              'apikey': this.apiKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting instance status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Conectar una instancia (generar QR Code)
   */
  async connectInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/instance/connect/${instanceName}`,
          {
            headers: {
              'apikey': this.apiKey,
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
  async getQRCode(instanceName: string) {
    try {
      const connectionState = await this.getInstanceStatus(instanceName);
      
      // Solo 'open' significa conectado completamente
      if (connectionState.instance?.state === 'open') {
        return { connected: true, qrcode: null };
      }
      
      // Para 'connecting' o 'close', necesitamos obtener el QR
      const connectResponse = await this.connectInstance(instanceName);
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
  async disconnectInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/logout/${instanceName}`,
          {
            headers: {
              'apikey': this.apiKey,
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
  async deleteInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/instance/delete/${instanceName}`,
          {
            headers: {
              'apikey': this.apiKey,
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
  async sendTextMessage(instanceName: string, to: string, text: string): Promise<SendMessageResponse> {
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
              'apikey': this.apiKey,
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
  async setWebhook(instanceName: string, webhookUrl: string) {
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
              'apikey': this.apiKey,
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
  async findInstance(instanceName: string) {
    try {
      const instances = await this.fetchInstances();
      return instances.find((inst: any) => inst.instance.instanceName === instanceName);
    } catch (error) {
      this.logger.error(`Error finding instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reiniciar una instancia
   */
  async restartInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.apiUrl}/instance/restart/${instanceName}`,
          {},
          {
            headers: {
              'apikey': this.apiKey,
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
  async getProfileInfo(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/chat/fetchProfile/${instanceName}`,
          {
            headers: {
              'apikey': this.apiKey,
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
  async checkNumberExists(instanceName: string, number: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/chat/whatsappNumbers/${instanceName}`,
          {
            numbers: [number],
          },
          {
            headers: {
              'apikey': this.apiKey,
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
}