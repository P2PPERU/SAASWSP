
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

// Services
import { AICoreService } from './services/ai-core.service';

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
  providers: [
    AICoreService,
  ],
  exports: [
    AICoreService,
  ],
})
export class AIModule {}