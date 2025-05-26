import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Entities
import { WhatsAppInstance, Conversation, Message, Tenant, User } from '../../database/entities';

// Controllers
import { WhatsAppController } from './whatsapp.controller';

// Services
import { WhatsAppService } from './whatsapp.service';
import { EvolutionApiService } from './services/evolution-api.service';

// Nuevos servicios (los crearemos después si no existen)
// import { SyncService } from './services/sync.service';
// import { MessageQueueService } from './services/message-queue.service';
// import { RateLimitService } from './services/rate-limit.service';

// Processors (los crearemos después si no existen)
// import { MessageProcessor } from './processors/message.processor';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      WhatsAppInstance, 
      Conversation, 
      Message,
      Tenant, // Agregado para verificar límites
      User    // Agregado para tracking
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    // Cola de mensajes para procesamiento asíncrono
    BullModule.registerQueue({
      name: 'whatsapp-messages',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService, 
    EvolutionApiService,
    // Descomenta estos servicios cuando los crees:
    // SyncService,
    // MessageQueueService,
    // RateLimitService,
    // MessageProcessor,
  ],
  exports: [
    WhatsAppService, 
    EvolutionApiService,
    // Exporta también los nuevos servicios cuando los agregues:
    // MessageQueueService,
    // RateLimitService,
  ],
})
export class WhatsAppModule {}