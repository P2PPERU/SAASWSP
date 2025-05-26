// src/modules/whatsapp/services/message-queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from '../../../database/entities';

@Injectable()
export class MessageQueueService {
  private readonly logger = new Logger(MessageQueueService.name);

  constructor(
    @InjectQueue('whatsapp-messages') private messageQueue: Queue,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  /**
   * Agregar mensaje a la cola con reintentos y prioridad
   */
  async queueMessage(data: {
    instanceId: string;
    to: string;
    text: string;
    messageId: string;
    priority?: number;
    retryCount?: number;
  }) {
    const job = await this.messageQueue.add('send-message', data, {
      priority: data.priority || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2 segundos inicial
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Mensaje agregado a la cola: ${job.id}`);
    return job;
  }

  /**
   * Programar mensaje para envío futuro
   */
  async scheduleMessage(data: {
    instanceId: string;
    to: string;
    text: string;
    sendAt: Date;
  }) {
    const delay = data.sendAt.getTime() - Date.now();
    
    if (delay <= 0) {
      throw new Error('La fecha de envío debe ser futura');
    }

    const job = await this.messageQueue.add('send-message', data, {
      delay,
      removeOnComplete: true,
    });

    this.logger.log(`Mensaje programado para ${data.sendAt}: ${job.id}`);
    return job;
  }

  /**
   * Procesar mensajes masivos con rate limiting
   */
  async queueBulkMessages(data: {
    instanceId: string;
    recipients: string[];
    text: string;
    delayBetweenMessages?: number; // milisegundos
  }) {
    const jobs = [];
    const delayBetween = data.delayBetweenMessages || 3000; // 3 segundos por defecto

    for (let i = 0; i < data.recipients.length; i++) {
      const recipient = data.recipients[i];
      const delay = i * delayBetween;

      const job = await this.messageQueue.add(
        'send-message',
        {
          instanceId: data.instanceId,
          to: recipient,
          text: data.text,
          isBulk: true,
          bulkIndex: i + 1,
          bulkTotal: data.recipients.length,
        },
        {
          delay,
          priority: -1, // Menor prioridad para mensajes masivos
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      jobs.push(job);
    }

    this.logger.log(`${jobs.length} mensajes agregados a la cola masiva`);
    return {
      totalQueued: jobs.length,
      estimatedTime: (jobs.length * delayBetween) / 1000, // segundos
      jobs: jobs.map(j => j.id),
    };
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats() {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    ] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount(),
      this.messageQueue.getDelayedCount(),
      this.messageQueue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + delayed,
    };
  }

  /**
   * Pausar/reanudar procesamiento
   */
  async pauseQueue() {
    await this.messageQueue.pause();
    this.logger.warn('Cola de mensajes pausada');
  }

  async resumeQueue() {
    await this.messageQueue.resume();
    this.logger.log('Cola de mensajes reanudada');
  }

  /**
   * Limpiar trabajos completados/fallidos
   */
  async cleanQueue(grace: number = 3600000) { // 1 hora por defecto
    const completed = await this.messageQueue.clean(grace, 'completed');
    const failed = await this.messageQueue.clean(grace, 'failed');
    
    this.logger.log(`Limpieza de cola: ${completed.length} completados, ${failed.length} fallidos`);
    return { completed: completed.length, failed: failed.length };
  }

  /**
   * Reintentar mensajes fallidos
   */
  async retryFailedMessages() {
    const failedJobs = await this.messageQueue.getFailed();
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        this.logger.error(`No se pudo reintentar job ${job.id}:`, error);
      }
    }

    this.logger.log(`${retried} mensajes fallidos reintentados`);
    return retried;
  }
}