// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Configurar CORS
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // Configurar prefixo global da API
  app.setGlobalPrefix(configService.get('API_PREFIX', 'api/v1'));

  // Configurar pipes globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/${configService.get('API_PREFIX', 'api/v1')}`);
}

bootstrap();