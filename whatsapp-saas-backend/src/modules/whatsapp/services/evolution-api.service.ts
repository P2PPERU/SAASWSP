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
   * 🚀 NUEVO: Detectar la URL correcta para webhooks según el entorno
   */
  private getWebhookBaseUrl(): string {
    // 1. Usar BACKEND_URL si está configurada (para Docker)
    const backendUrl = this.configService.get<string>('BACKEND_URL');
    if (backendUrl) {
      this.logger.log(`📡 Using BACKEND_URL for webhooks: ${backendUrl}`);
      return backendUrl;
    }

    // 2. Detectar si estamos en Docker
    const dockerHostUrl = this.configService.get<string>('DOCKER_HOST_URL');
    if (dockerHostUrl) {
      this.logger.log(`🐳 Using DOCKER_HOST_URL for webhooks: ${dockerHostUrl}`);
      return dockerHostUrl;
    }

    // 3. Fallback a localhost
    const port = this.configService.get<number>('PORT', 3000);
    const fallbackUrl = `http://localhost:${port}`;
    this.logger.log(`🏠 Using fallback URL for webhooks: ${fallbackUrl}`);
    return fallbackUrl;
  }

  /**
   * 🔧 MEJORADO: Crear una nueva instancia de WhatsApp con webhooks automáticos
   */
  async createInstance(instanceName: string, tenantId: string): Promise<CreateInstanceResponse> {
    try {
      this.logger.log(`Creating instance: ${instanceName} for tenant: ${tenantId}`);

      // 🚀 MEJORADO: Detectar la URL correcta para webhooks
      const webhookBaseUrl = this.getWebhookBaseUrl();
      
      const response = await firstValueFrom(
        this.httpService.post<CreateInstanceResponse>(
          `${this.apiUrl}/instance/create`,
          {
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: `${webhookBaseUrl}/api/v1/whatsapp/webhook/${instanceName}`,
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
                // Agregar eventos adicionales útiles
                'PRESENCE_UPDATE',
                'CHATS_SET',
                'CHATS_UPSERT',
                'CHATS_UPDATE',
                'CONTACTS_SET',
                'CONTACTS_UPSERT',
                'CONTACTS_UPDATE',
              ],
            },
          },
          {
            headers: {
              'apikey': this.globalApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 segundos timeout
          },
        ),
      );

      this.logger.log(`✅ Instance created successfully: ${instanceName}`);
      this.logger.log(`🌐 Webhook URL: ${webhookBaseUrl}/api/v1/whatsapp/webhook/${instanceName}`);
      
      // 🔧 MEJORADO: Manejar diferentes formatos de API Key
      const apiKey = this.extractApiKey(response.data.hash);
      
      if (!apiKey) {
        this.logger.error('❌ No API Key received from Evolution API');
        this.logger.error(`Hash received: ${JSON.stringify(response.data.hash)}`);
        throw new Error('No API Key received from Evolution API');
      }
      
      this.logger.log(`🔑 Instance API Key received: ${apiKey.substring(0, 10)}...`);
      
      return {
        ...response.data,
        hash: apiKey, // Normalizar el formato
      };
    } catch (error) {
      this.logger.error(`❌ Error creating instance: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 🔧 NUEVO: Extraer API Key de diferentes formatos
   */
  private extractApiKey(hash: any): string | null {
    if (!hash) return null;
    
    // Si es string directo
    if (typeof hash === 'string') {
      return this.validateApiKey(hash) ? hash : null;
    }
    
    // Si es objeto, buscar en diferentes propiedades
    if (typeof hash === 'object') {
      const possibleKeys = ['apikey', 'api_key', 'key', 'token'];
      for (const key of possibleKeys) {
        if (hash[key] && this.validateApiKey(hash[key])) {
          return hash[key];
        }
      }
    }
    
    return null;
  }

  /**
   * 🔧 NUEVO: Validar formato de API Key
   */
  private validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    // Evolution API keys suelen tener formato UUID o similar (32 caracteres hex)
    const apiKeyRegex = /^[A-F0-9]{32}$/i;
    const cleanKey = apiKey.replace(/-/g, '');
    
    return cleanKey.length >= 20 && (apiKeyRegex.test(cleanKey) || cleanKey.length === 32);
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
            timeout: 15000,
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
   * 🔧 MEJORADO: Obtener el estado de conexión de una instancia
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
            timeout: 15000,
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
            timeout: 30000, // Mayor timeout para QR generation
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
            timeout: 15000,
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
            timeout: 15000,
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
   * 🔧 MEJORADO: Enviar un mensaje de texto con mejor manejo de errores
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
            timeout: 30000, // 30 segundos para envío de mensaje
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
   * 🔧 MEJORADO: Configurar webhook para recibir eventos
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
                'CHATS_SET',
                'CHATS_UPSERT',
                'CHATS_UPDATE',
                'CONTACTS_SET',
                'CONTACTS_UPSERT',
                'CONTACTS_UPDATE',
              ],
            },
          },
          {
            headers: {
              'apikey': this.getApiKey(instanceApiKey),
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        ),
      );

      this.logger.log(`✅ Webhook configured for instance: ${instanceName}`);
      this.logger.log(`🌐 Webhook URL: ${webhookUrl}`);
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
            timeout: 30000, // Mayor timeout para restart
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
            timeout: 15000,
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
            timeout: 15000,
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
            timeout: 20000, // Mayor timeout para chats
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
            timeout: 20000,
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