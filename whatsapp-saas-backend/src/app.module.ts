// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios'; // <-- NUEVO IMPORT
import { TypeOrmModule } from '@nestjs/typeorm'; // <-- NUEVO IMPORT

// Database
import { DatabaseModule } from './database/database.module';

// Controller
import { AppController } from './app.controller'; // <-- NUEVO IMPORT

// Core Modules existentes
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AIModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// Guards existentes
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// Entities
import { Tenant } from './database/entities'; // <-- NUEVO IMPORT

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

    // HTTP Module para health checks
    HttpModule, // <-- AGREGADO
    
    // TypeORM para el AppController
    TypeOrmModule.forFeature([Tenant]), // <-- AGREGADO

    // Módulos de negocio existentes
    AuthModule,
    TenantModule,
    WhatsAppModule,
    AIModule,
    AnalyticsModule,
    
    // Agrega estos módulos cuando los crees:
    // WebhookModule,
    // BillingModule,
    // EventsModule,
  ],
  controllers: [AppController], // <-- AGREGADO AppController
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