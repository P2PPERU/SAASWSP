// src/modules/whatsapp/whatsapp.module.ts
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
import { SyncService } from './services/sync.service';
import { MessageQueueService } from './services/message-queue.service';
import { RateLimitService } from './services/rate-limit.service';

// Guards
import { WebhookSecurityGuard } from './guards/webhook-security.guard';

// Processors
import { MessageProcessor } from './processors/message.processor';

// Modules externos
import { TenantModule } from '../tenant/tenant.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    TenantModule, // Importar TenantModule para usar TenantService
    AIModule, // Importar AIModule para usar AICoreService
    TypeOrmModule.forFeature([
      WhatsAppInstance, 
      Conversation, 
      Message,
      Tenant,
      User
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
    WebhookSecurityGuard,
    SyncService,
    MessageQueueService,
    RateLimitService,
    MessageProcessor,
  ],
  exports: [
    WhatsAppService, 
    EvolutionApiService,
    MessageQueueService,
    RateLimitService,
  ],
})
export class WhatsAppModule {}