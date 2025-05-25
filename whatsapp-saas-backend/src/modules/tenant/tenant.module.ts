// src/modules/tenant/tenant.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { WhatsAppInstance } from '../../database/entities/whatsapp-instance.entity';
import { Message } from '../../database/entities/message.entity';
import { Conversation } from '../../database/entities/conversation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      WhatsAppInstance,
      Message,
      Conversation,
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}