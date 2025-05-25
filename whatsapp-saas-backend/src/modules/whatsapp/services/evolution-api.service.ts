import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
  }

  /**
   * Crear una nueva instancia de WhatsApp
   */
  async createInstance(instanceName: string, tenantId: string) {
    try {
      this.logger.log(`Creating instance: ${instanceName} for tenant: ${tenantId}`);
      this.logger.log(`Evolution API URL: ${this.apiUrl}`);
      this.logger.log(`API Key configured: ${this.apiKey ? 'Yes' : 'No'}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/instance/create`,
          {
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          },
          {
            headers: {
              'apikey': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Instance created: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating instance: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
      throw error;
    }
  }

  /**
   * Obtener el estado de una instancia
   */
  async getInstanceStatus(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/api/instances/${instanceName}/status`,
          {
            headers: {
              'X-API-KEY': this.apiKey,
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
   * Obtener el código QR para conectar
   */
  async getQRCode(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/api/instances/${instanceName}/qr`,
          {
            headers: {
              'X-API-KEY': this.apiKey,
            },
          },
        ),
      );

      this.logger.log(`QR Code obtained for instance: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting QR code: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
      throw error;
    }
  }

  /**
   * Desconectar una instancia
   */
  async disconnectInstance(instanceName: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/api/instances/${instanceName}/logout`,
          {},
          {
            headers: {
              'X-API-KEY': this.apiKey,
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
          `${this.apiUrl}/api/instances/${instanceName}`,
          {
            headers: {
              'X-API-KEY': this.apiKey,
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
  async sendTextMessage(instanceName: string, to: string, text: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/api/instances/${instanceName}/send/text`,
          {
            to: to,
            message: text,
          },
          {
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Message sent to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configurar webhook para recibir mensajes
   */
  async setWebhook(instanceName: string, webhookUrl: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/api/instances/${instanceName}/webhook`,
          {
            url: webhookUrl,
          },
          {
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Webhook configured for instance: ${instanceName}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error setting webhook: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
      throw error;
    }
  }
}