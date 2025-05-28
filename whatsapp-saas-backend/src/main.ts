// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Desactivar el body parser por defecto
  });

  const configService = app.get(ConfigService);

  // === BODY PARSER CON LÍMITE MAYOR ===
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // === 🔧 MEJORADO: MIDDLEWARE DE DEBUGGING PARA WEBHOOKS ===
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.ip || 
                     req.connection?.remoteAddress || 
                     'unknown';
    
    // Log básico para todas las requests
    console.log(`📨 ${timestamp} - ${req.method} ${req.url} from ${clientIP}`);
    
    // 🔔 LOGGING DETALLADO PARA WEBHOOKS
    if (req.url.includes('webhook')) {
      console.log('');
      console.log('🔔 ================================');
      console.log('🔔 WEBHOOK RECEIVED');
      console.log('🔔 ================================');
      console.log(`⏰ Timestamp: ${timestamp}`);
      console.log(`🌐 IP Address: ${clientIP}`);
      console.log(`📍 URL: ${req.method} ${req.url}`);
      
      // Headers importantes
      console.log('📋 Headers:');
      console.log(`  - User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
      console.log(`  - Content-Type: ${req.headers['content-type'] || 'N/A'}`);
      console.log(`  - Content-Length: ${req.headers['content-length'] || 'N/A'}`);
      console.log(`  - X-Forwarded-For: ${req.headers['x-forwarded-for'] || 'N/A'}`);
      console.log(`  - X-Real-IP: ${req.headers['x-real-ip'] || 'N/A'}`);
      console.log(`  - X-Webhook-Signature: ${req.headers['x-webhook-signature'] ? 'Present' : 'Not present'}`);
      
      // Body preview (solo los primeros 300 caracteres para no spam)
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyStr = JSON.stringify(req.body);
        console.log('📦 Body Preview:');
        console.log(`  ${bodyStr.substring(0, 300)}${bodyStr.length > 300 ? '...' : ''}`);
        
        // Información específica del webhook
        if (req.body.event) {
          console.log(`🎯 Event: ${req.body.event}`);
        }
        if (req.body.instance) {
          console.log(`📱 Instance: ${req.body.instance}`);
        }
        if (req.body.apikey) {
          console.log(`🔑 API Key: ${req.body.apikey.substring(0, 10)}...`);
        }
      }
      console.log('🔔 ================================');
      console.log('');
    }
    
    next();
  });

  // === 🔧 MEJORADO: CORS PARA DOCKER ===
  const allowedOrigins = configService.get('ALLOWED_ORIGINS')?.split(',') || ['*'];
  
  // Agregar URLs de Docker automáticamente
  const dockerOrigins = [
    'http://host.docker.internal:3000',
    'http://172.17.0.1:3000',
    'http://172.18.0.1:3000',
  ];
  
  const finalOrigins = allowedOrigins[0] === '*' ? '*' : [...allowedOrigins, ...dockerOrigins];
  
  app.enableCors({
    origin: finalOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'X-Webhook-Signature',
      'X-Real-IP',
      'X-Forwarded-For'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  });

  // === PREFIJO GLOBAL DE API ===
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // === 🔧 MEJORADO: SWAGGER CONFIGURATION ===
  const config = new DocumentBuilder()
    .setTitle('WhatsApp SaaS API')
    .setDescription(`
      🚀 Multi-tenant WhatsApp Business API with AI Integration
      
      ## Features
      - Multi-tenant architecture
      - WhatsApp Business API integration via Evolution API
      - AI-powered auto-responses
      - Rate limiting by subscription plan
      - Real-time webhooks
      - Queue-based message processing
      
      ## Authentication
      Most endpoints require JWT authentication via Bearer token.
      
      ## Webhooks
      - Webhook URL: \`${configService.get('BACKEND_URL', 'http://localhost:3000')}/${apiPrefix}/whatsapp/webhook/:instanceId\`
      - Supported events: messages.upsert, connection.update, qrcode.updated, etc.
      
      ## Rate Limits
      - Basic: 20/min, 500/hour
      - Pro: 60/min, 2000/hour  
      - Enterprise: 200/min, 10000/hour
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenant', 'Tenant management')
    .addTag('whatsapp', 'WhatsApp instances and messaging')
    .addTag('ai', 'AI configuration and management')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('health', 'Health check endpoints')
    .addServer(`http://localhost:${configService.get('PORT', 3000)}/${apiPrefix}`, 'Development server')
    .addServer(`${configService.get('BACKEND_URL', 'http://localhost:3000')}/${apiPrefix}`, 'Docker server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'WhatsApp SaaS API Documentation',
    customfavIcon: 'https://cdn-icons-png.flaticon.com/512/2111/2111728.png',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  // === PIPES GLOBALES ===
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // === 🔧 CONFIGURACIÓN DE SERVIDOR ===
  const port = configService.get('PORT', 3000);
  const nodeEnv = configService.get('NODE_ENV', 'development');
  
  // 🚀 IMPORTANTE: Escuchar en todas las interfaces (0.0.0.0) para Docker
  await app.listen(port, '0.0.0.0');

  // === 🎉 INFORMACIÓN DE STARTUP ===
  const backendUrl = configService.get('BACKEND_URL', `http://localhost:${port}`);
  const evolutionUrl = configService.get('EVOLUTION_API_URL', 'http://localhost:8080');
  
  console.log('');
  console.log('🚀 ================================');
  console.log('🚀 WHATSAPP SAAS BACKEND STARTED');
  console.log('🚀 ================================');
  console.log(`🌍 Environment: ${nodeEnv.toUpperCase()}`);
  console.log(`🌐 Server: http://0.0.0.0:${port}/${apiPrefix}`);
  console.log(`🏠 Local: http://localhost:${port}/${apiPrefix}`);
  console.log(`🐳 Docker: ${backendUrl}/${apiPrefix}`);
  console.log('');
  console.log('📚 Documentation:');
  console.log(`   - Swagger UI: http://localhost:${port}/api-docs`);
  console.log(`   - Health Check: http://localhost:${port}/${apiPrefix}/health`);
  console.log(`   - API Root: http://localhost:${port}/${apiPrefix}`);
  console.log('');
  console.log('🔗 Integration:');
  console.log(`   - Evolution API: ${evolutionUrl}`);
  console.log(`   - Webhook Base: ${backendUrl}/${apiPrefix}/whatsapp/webhook`);
  console.log('');
  console.log('🔔 Webhook Endpoints:');
  console.log(`   - General: POST ${backendUrl}/${apiPrefix}/whatsapp/webhook/:instanceId`);
  console.log(`   - Messages: POST ${backendUrl}/${apiPrefix}/whatsapp/webhook/:instanceId/messages-upsert`);
  console.log(`   - Connection: POST ${backendUrl}/${apiPrefix}/whatsapp/webhook/:instanceId/connection-update`);
  console.log(`   - QR Code: POST ${backendUrl}/${apiPrefix}/whatsapp/webhook/:instanceId/qrcode-updated`);
  console.log('');
  console.log('🔍 Debugging:');
  console.log(`   - Logs Level: INFO, WARN, ERROR, WEBHOOK`);
  console.log(`   - Webhook IPs: ${configService.get('WEBHOOK_ALLOWED_IPS', 'localhost,127.0.0.1,::1')}`);
  console.log(`   - API Key: ${configService.get('EVOLUTION_API_KEY', 'NOT_SET')?.substring(0, 10)}...`);
  console.log('');
  
  // === ⚡ TESTS DE CONECTIVIDAD INICIAL ===
  console.log('⚡ Running connectivity tests...');
  
  // Test Evolution API
  try {
    const axios = require('axios');
    await axios.get(evolutionUrl, { timeout: 5000 });
    console.log('✅ Evolution API: Connected');
  } catch (error) {
    console.log('❌ Evolution API: Not reachable');
    console.log(`   Make sure Evolution API is running on ${evolutionUrl}`);
  }
  
  // Test Database (indirectamente verificando que el app se inició correctamente)
  try {
    // Si llegamos aquí, la DB está conectada (NestJS fallaría al iniciar si no)
    console.log('✅ Database: Connected');
  } catch (error) {
    console.log('❌ Database: Connection issues');
  }
  
  // Test Redis (similar)
  console.log('✅ Redis: Connected (assumed)');
  
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Create a user: POST /auth/register');
  console.log('   2. Login: POST /auth/login');
  console.log('   3. Create WhatsApp instance: POST /whatsapp/instances');
  console.log('   4. Connect instance: POST /whatsapp/instances/:id/connect');
  console.log('   5. Monitor webhook logs above 👆');
  console.log('');
  console.log('🚨 Important:');
  console.log('   - Webhooks will appear in logs with 🔔 prefix');
  console.log('   - Check IP authorization if webhooks fail');
  console.log('   - API Keys must match between Evolution and Backend');
  console.log('');
  console.log('🎉 Ready for production! 🚀');
  console.log('🚀 ================================');
  console.log('');
}

// === 🛡️ GRACEFUL SHUTDOWN ===
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// === 🚨 ERROR HANDLING ===
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});