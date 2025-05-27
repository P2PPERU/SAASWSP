// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './database/entities';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller()
export class AppController {
  private redis: Redis;

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private httpService: HttpService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'API root information' })
  getRoot() {
    return {
      name: 'WhatsApp SaaS API',
      version: '1.0.0',
      description: 'Multi-tenant WhatsApp Business API with AI',
      documentation: '/api-docs',
      health: '/health',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async checkHealth() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'ok',
        database: 'checking',
        redis: 'checking',
        evolution: 'checking',
        openai: 'checking',
      },
      details: {} as any,
    };

    // 1. Check Database
    try {
      await this.tenantRepository.count();
      checks.services.database = 'ok';
      checks.details.database = { connected: true };
    } catch (error) {
      checks.services.database = 'error';
      checks.status = 'degraded';
      checks.details.database = { connected: false, error: error.message };
    }

    // 2. Check Redis
    try {
      await this.redis.ping();
      checks.services.redis = 'ok';
      checks.details.redis = { connected: true };
    } catch (error) {
      checks.services.redis = 'error';
      checks.status = 'degraded';
      checks.details.redis = { connected: false, error: error.message };
    }

    // 3. Check Evolution API
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
          {
            headers: { apikey: process.env.EVOLUTION_API_KEY },
            timeout: 5000,
          }
        )
      );
      checks.services.evolution = 'ok';
      checks.details.evolution = { 
        connected: true, 
        instances: response.data.length 
      };
    } catch (error) {
      checks.services.evolution = 'error';
      checks.status = 'degraded';
      checks.details.evolution = { connected: false, error: error.message };
    }

    // 4. Check OpenAI (basic check)
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20) {
      checks.services.openai = 'ok';
      checks.details.openai = { configured: true };
    } else {
      checks.services.openai = 'error';
      checks.status = 'degraded';
      checks.details.openai = { configured: false };
    }

    // Set HTTP status based on health
    const httpStatus = checks.status === 'ok' ? 200 : 503;
    
    return {
      statusCode: httpStatus,
      ...checks,
    };
  }
}