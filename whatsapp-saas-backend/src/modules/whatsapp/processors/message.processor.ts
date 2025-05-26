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
    const { instanceId, to, text, messageId } = job.data;

    this.logger.log(`Processing message ${messageId || 'new'} to ${to}`);

    try {
      // Obtener la instancia
      const instance = await this.instanceRepository.findOne({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }
      
      // Enviar mensaje
      const result = await this.evolutionApiService.sendTextMessage(
        instance.instanceKey,
        to,
        text
      );

      // Si se proporcionó un messageId, actualizar el estado
      if (messageId) {
        await this.updateMessageStatus(messageId, MessageStatus.SENT, {
          evolutionMessageId: result.key.id,
          sentAt: new Date(),
        });
      }

      this.logger.log(`Message sent successfully to ${to}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to send message:`, error);
      
      // Actualizar estado a fallido si hay messageId
      if (messageId) {
        await this.updateMessageStatus(messageId, MessageStatus.FAILED, {
          error: error.message,
          failedAt: new Date(),
        });
      }

      // Re-lanzar para que Bull maneje los reintentos
      throw error;
    }
  }

  private async updateMessageStatus(messageId: string, status: MessageStatus, aiContext?: any) {
    await this.messageRepository.update(
      { id: messageId },
      {
        status,
        ...(aiContext && { aiContext }),
      }
    );
  }
}