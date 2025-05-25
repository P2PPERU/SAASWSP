import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { EvolutionApiService } from './services/evolution-api.service';
import { WhatsAppInstance, Conversation, Message } from '../../database/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WhatsAppInstance, Conversation, Message]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, EvolutionApiService],
  exports: [WhatsAppService, EvolutionApiService],
})
export class WhatsAppModule {}