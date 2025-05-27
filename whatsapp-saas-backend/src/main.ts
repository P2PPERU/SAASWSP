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

  // === MIDDLEWARE DE DEBUGGING ===
  app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.url.includes('webhook')) {
      console.log('🔍 Webhook Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🔍 Webhook Body:', req.body ? `${JSON.stringify(req.body).substring(0, 500)}...` : 'undefined');
    }
    next();
  });

  // === CORS ===
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // === Prefijo global de API ===
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // === SWAGGER CONFIGURATION ===
  const config = new DocumentBuilder()
    .setTitle('WhatsApp SaaS API')
    .setDescription('Multi-tenant WhatsApp Business API with AI Integration')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenant', 'Tenant management')
    .addTag('whatsapp', 'WhatsApp instances and messaging')
    .addTag('ai', 'AI configuration and management')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'WhatsApp SaaS API Docs',
    customfavIcon: 'https://avatars.githubusercontent.com/u/1481964?s=200&v=4',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  // === Pipes globales ===
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`
    🚀 Application is running on: http://localhost:${port}/${apiPrefix}
    📚 API Documentation: http://localhost:${port}/api-docs
    🏥 Health Check: http://localhost:${port}/${apiPrefix}/health
    🏠 API Info: http://localhost:${port}/${apiPrefix}
  `);
}

bootstrap();