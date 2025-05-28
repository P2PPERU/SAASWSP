// src/modules/whatsapp/processors/message.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus, WhatsAppInstance } from '../../../database/entities';
import { EvolutionApiService } from '../services/evolution-api.service';

@Processor('whatsapp-messages')
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
    private evolutionApiService: EvolutionApiService,
  ) {}

  @Process('send-message')
  async handleSendMessage(job: Job) {
    const { instanceId, to, text, messageId, isBulk, bulkIndex, bulkTotal } = job.data;

    this.logger.log(`Processing message ${messageId || 'new'} to ${to}`);
    
    if (isBulk) {
      this.logger.log(`Bulk message ${bulkIndex}/${bulkTotal}`);
    }

    try {
      // Obtener la instancia CON su API Key específica
      const instance = await this.instanceRepository.findOne({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      // Verificar que la instancia tenga API Key
      if (!instance.apiKey) {
        this.logger.error(`Instance ${instance.name} doesn't have an API Key`);
        throw new Error(`Instance ${instance.name} is missing API Key`);
      }
      
      // Enviar mensaje usando la API Key específica de la instancia
      const result = await this.evolutionApiService.sendTextMessage(
        instance.instanceKey,
        to,
        text,
        instance.apiKey // <-- USAR LA API KEY ESPECÍFICA DE LA INSTANCIA
      );

      // Si se proporcionó un messageId, actualizar el estado
      if (messageId) {
        await this.updateMessageStatus(messageId, MessageStatus.SENT, {
          evolutionMessageId: result.key?.id,
          sentAt: new Date(),
          apiKeyUsed: instance.apiKey.substring(0, 10) + '...', // Log parcial por seguridad
        });
      }

      this.logger.log(`✅ Message sent successfully to ${to} using instance API Key`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Failed to send message:`, error);
      
      // Actualizar estado a fallido si hay messageId
      if (messageId) {
        await this.updateMessageStatus(messageId, MessageStatus.FAILED, {
          error: error.message,
          failedAt: new Date(),
          attemptNumber: job.attemptsMade,
        });
      }

      // Re-lanzar para que Bull maneje los reintentos
      throw error;
    }
  }

  @Process('send-media')
  async handleSendMedia(job: Job) {
    const { instanceId, to, mediaUrl, caption, mediaType, messageId } = job.data;

    this.logger.log(`Processing media message ${messageId || 'new'} to ${to}`);

    try {
      // Obtener la instancia CON su API Key
      const instance = await this.instanceRepository.findOne({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      if (!instance.apiKey) {
        throw new Error(`Instance ${instance.name} is missing API Key`);
      }

      // TODO: Implementar envío de media cuando esté disponible en EvolutionApiService
      // Por ahora lanzar error
      throw new Error('Media sending not implemented yet');

    } catch (error) {
      this.logger.error(`Failed to send media:`, error);
      
      if (messageId) {
        await this.updateMessageStatus(messageId, MessageStatus.FAILED, {
          error: error.message,
          failedAt: new Date(),
        });
      }

      throw error;
    }
  }

  private async updateMessageStatus(messageId: string, status: MessageStatus, metadata?: any) {
    try {
      await this.messageRepository.update(
        { id: messageId },
        {
          status,
          ...(metadata && { 
            aiContext: {
              ...metadata,
              updatedAt: new Date().toISOString(),
            }
          }),
        }
      );
    } catch (error) {
      this.logger.error(`Error updating message status: ${error.message}`);
    }
  }
}