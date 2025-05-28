// src/modules/whatsapp/guards/webhook-security.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppInstance } from '../../../database/entities';

@Injectable()
export class WebhookSecurityGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSecurityGuard.name);
  private readonly globalApiKey: string;
  private readonly webhookSecret: string;
  private readonly allowedIPs: string[];

  constructor(
    private configService: ConfigService,
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
  ) {
    this.globalApiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET', '');
    
    // IPs permitidas (localhost, docker, tu IP local)
    const configuredIPs = this.configService.get<string>('WEBHOOK_ALLOWED_IPS', 'localhost,127.0.0.1,::1,172.17.0.1,host.docker.internal');
    this.allowedIPs = configuredIPs.split(',').map(ip => ip.trim());
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 1. Validar IP de origen (opcional pero recomendado)
    const clientIP = this.getClientIP(request);
    if (!this.isAllowedIP(clientIP)) {
      this.logger.warn(`Webhook rechazado - IP no autorizada: ${clientIP}`);
      throw new UnauthorizedException('IP not authorized');
    }

    // 2. Validar API Key en el body del webhook
    const webhookData = request.body;
    
    // Si no hay datos, rechazar
    if (!webhookData) {
      this.logger.warn('Webhook rechazado - Sin body');
      throw new UnauthorizedException('Missing webhook data');
    }

    // Evolution v2 envía el API key en el body
    const providedApiKey = webhookData.apikey;
    if (!providedApiKey) {
      this.logger.warn('Webhook rechazado - Sin API key en el body');
      throw new UnauthorizedException('Missing API key');
    }

    // 3. Verificar contra la API Key de la instancia específica
    // Obtener el instanceName del webhook
    const instanceName = webhookData.instance;
    
    if (instanceName) {
      try {
        // Buscar la instancia por instanceKey
        const instance = await this.instanceRepository.findOne({
          where: { instanceKey: instanceName }
        });

        if (instance && instance.apiKey) {
          // Validar contra la API Key específica de la instancia
          if (providedApiKey !== instance.apiKey) {
            this.logger.warn(`Webhook rechazado - API key inválida para instancia ${instanceName}`);
            throw new UnauthorizedException('Invalid instance API key');
          }
          
          this.logger.debug(`✅ Webhook autorizado con API Key de instancia ${instance.name}`);
          return true;
        }
      } catch (error) {
        this.logger.error(`Error verificando instancia: ${error.message}`);
      }
    }

    // 4. Si no se encontró la instancia, validar contra la API Key global
    // Esto puede pasar con webhooks de sistema o instancias nuevas
    if (providedApiKey === this.globalApiKey) {
      this.logger.debug('✅ Webhook autorizado con API Key global');
      return true;
    }

    // 5. Validar token secreto adicional (si está configurado)
    if (this.webhookSecret) {
      const providedSecret = request.headers['x-webhook-secret'] as string;
      if (providedSecret === this.webhookSecret) {
        this.logger.debug('✅ Webhook autorizado con token secreto');
        return true;
      }
    }

    // 6. Validar que el webhook viene de Evolution (por server_url)
    if (webhookData.server_url) {
      const allowedUrls = [
        'http://localhost:8080',
        'http://evolution-api:8080',
        this.configService.get('EVOLUTION_API_URL')
      ].filter(Boolean);
      
      if (!allowedUrls.includes(webhookData.server_url)) {
        this.logger.warn(`Webhook rechazado - server_url no autorizado: ${webhookData.server_url}`);
        throw new UnauthorizedException('Invalid server URL');
      }
    }

    // Si llegamos aquí, el webhook no está autorizado
    this.logger.warn('Webhook rechazado - No pasó ninguna validación de seguridad');
    throw new UnauthorizedException('Webhook not authorized');
  }

  private getClientIP(request: Request): string {
    // Obtener IP real considerando proxies
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers['x-real-ip'] as string;
    if (realIP) {
      return realIP;
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  private isAllowedIP(clientIP: string): boolean {
    // Si no hay IPs configuradas, permitir todas (no recomendado en producción)
    if (this.allowedIPs.length === 0) {
      return true;
    }

    // Normalizar IP
    const normalizedIP = clientIP.replace('::ffff:', ''); // IPv4 mapped to IPv6
    
    // Verificar si la IP está en la lista de permitidas
    return this.allowedIPs.some(allowedIP => {
      // Soporte para wildcards simples (ej: 192.168.*.*)
      if (allowedIP.includes('*')) {
        const pattern = allowedIP.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(normalizedIP);
      }
      
      return normalizedIP === allowedIP || 
             clientIP === allowedIP || 
             allowedIP === 'localhost' && (normalizedIP === '127.0.0.1' || normalizedIP === '::1');
    });
  }
}