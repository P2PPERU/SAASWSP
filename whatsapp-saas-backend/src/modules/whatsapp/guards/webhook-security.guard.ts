// src/modules/whatsapp/guards/webhook-security.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookSecurityGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSecurityGuard.name);
  private readonly evolutionApiKey: string;
  private readonly webhookSecret: string;
  private readonly allowedIPs: string[];

  constructor(private configService: ConfigService) {
    this.evolutionApiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET', '');
    
    // IPs permitidas (localhost, docker, tu IP local)
    const configuredIPs = this.configService.get<string>('WEBHOOK_ALLOWED_IPS', 'localhost,127.0.0.1,::1,172.17.0.1,host.docker.internal');
    this.allowedIPs = configuredIPs.split(',').map(ip => ip.trim());
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 1. Validar IP de origen (opcional pero recomendado)
    const clientIP = this.getClientIP(request);
    if (!this.isAllowedIP(clientIP)) {
      this.logger.warn(`Webhook rechazado - IP no autorizada: ${clientIP}`);
      throw new UnauthorizedException('IP not authorized');
    }

    // 2. Validar API Key en el body del webhook
    const webhookData = request.body;
    if (!webhookData || !webhookData.apikey) {
      this.logger.warn('Webhook rechazado - Sin API key en el body');
      throw new UnauthorizedException('Missing API key');
    }

    // Evolution envía el API key en el body del webhook
    if (webhookData.apikey !== this.evolutionApiKey) {
      this.logger.warn(`Webhook rechazado - API key inválida: ${webhookData.apikey}`);
      throw new UnauthorizedException('Invalid API key');
    }

    // 3. Validar token secreto adicional (si está configurado)
    if (this.webhookSecret) {
      const providedSecret = request.headers['x-webhook-secret'] as string;
      if (providedSecret !== this.webhookSecret) {
        this.logger.warn('Webhook rechazado - Token secreto inválido');
        throw new UnauthorizedException('Invalid webhook secret');
      }
    }

    // 4. Validar que el webhook viene de Evolution (por server_url)
    if (webhookData.server_url) {
      const allowedUrls = [
        'http://localhost:8080',
        'http://evolution-api:8080',
        this.configService.get('EVOLUTION_API_URL')
      ];
      
      if (!allowedUrls.includes(webhookData.server_url)) {
        this.logger.warn(`Webhook rechazado - server_url no autorizado: ${webhookData.server_url}`);
        throw new UnauthorizedException('Invalid server URL');
      }
    }

    this.logger.debug(`Webhook autorizado desde IP: ${clientIP}`);
    return true;
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
      
      return normalizedIP === allowedIP || clientIP === allowedIP;
    });
  }
}