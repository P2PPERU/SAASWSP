// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { 
  AIProfile, 
  Tenant, 
  Conversation, 
  Message 
} from '../../database/entities';

// Controllers
import { AIConfigController } from './controllers/ai-config.controller';

// Services
import { AICoreService } from './services/ai-core.service';
import { AIConfigService } from './services/ai-config.service';

// Modules
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    ConfigModule,
    TenantModule,
    TypeOrmModule.forFeature([
      AIProfile,
      Tenant,
      Conversation,
      Message,
    ]),
  ],
  controllers: [
    AIConfigController, // <-- Agregado el controller
  ],
  providers: [
    AICoreService,
    AIConfigService,   // <-- Agregado el service
  ],
  exports: [
    AICoreService,
    AIConfigService,   // <-- Exportado el service
  ],
})
export class AIModule {}