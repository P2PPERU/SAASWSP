// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';

// Database
import { DatabaseModule } from './database/database.module';

// Core Modules existentes
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AIModule } from './modules/ai/ai.module';

// Guards existentes
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 segundos en milisegundos
      limit: 100,
    }]),

    // Tareas programadas
    ScheduleModule.forRoot(),

    // Cola de mensajes
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Base de datos
    DatabaseModule,

    // Módulos de negocio existentes
    AuthModule,
    TenantModule,
    WhatsAppModule,
    AIModule,
    
    // Agrega estos módulos cuando los crees:
    // AnalyticsModule,
    // WebhookModule,
    // BillingModule,
    // EventsModule,
  ],
  controllers: [],
  providers: [
    // Guards globales
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Agrega más guards e interceptors cuando los crees
  ],
})
export class AppModule {}