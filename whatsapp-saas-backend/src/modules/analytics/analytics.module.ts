// src/modules/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { 
  Message, 
  Conversation, 
  WhatsAppInstance 
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      Conversation,
      WhatsAppInstance,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}