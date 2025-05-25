// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // === MIDDLEWARE DE DEBUGGING ===
  app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.url.includes('webhook')) {
      console.log('🔍 Webhook Headers:', JSON.stringify(req.headers, null, 2));
      // Para ver el body necesitas tener el body-parser activo (Nest lo usa por defecto para JSON)
      // Si el body aparece vacío, verifica que la petición tenga Content-Type: application/json o urlencoded
      console.log('🔍 Webhook Body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });

  const configService = app.get(ConfigService);

  // === CORS ===
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // === Prefijo global de API ===
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));

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

  console.log(
    `🚀 Application is running on: http://localhost:${port}/${configService.get(
      'API_PREFIX',
      'api/v1',
    )}`,
  );
}

bootstrap();
