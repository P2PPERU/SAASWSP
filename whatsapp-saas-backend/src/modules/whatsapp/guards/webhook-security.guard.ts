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
    
    // 🔧 MEJORADO: IPs permitidas más específicas para Docker
    const configuredIPs = this.configService.get<string>(
      'WEBHOOK_ALLOWED_IPS', 
      'localhost,127.0.0.1,::1,172.17.0.1,172.18.0.1,host.docker.internal'
    );
    this.allowedIPs = configuredIPs.split(',').map(ip => ip.trim());
    
    this.logger.log(`🔒 Webhook security initialized`);
    this.logger.log(`🔑 Global API Key: ${this.globalApiKey?.substring(0, 10)}...`);
    this.logger.log(`🛡️  Webhook Secret: ${this.webhookSecret ? 'Configured' : 'Not configured'}`);
    this.logger.log(`🌐 Allowed IPs (${this.allowedIPs.length}): ${this.allowedIPs.join(', ')}`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIP = this.getClientIP(request);
    const timestamp = new Date().toISOString();
    
    this.logger.debug(`🔔 [${timestamp}] Webhook security check for IP: ${clientIP}`);
    
    try {
      // 1. Validar IP de origen
      if (!this.isAllowedIP(clientIP)) {
        this.logger.warn(`❌ [SECURITY] IP not authorized: ${clientIP}`);
        this.logger.debug(`🔍 Allowed IPs: ${this.allowedIPs.join(', ')}`);
        throw new UnauthorizedException(`IP ${clientIP} not authorized for webhooks`);
      }
      this.logger.debug(`✅ IP authorized: ${clientIP}`);

      // 2. Validar webhook data
      const webhookData = request.body;
      if (!webhookData || Object.keys(webhookData).length === 0) {
        this.logger.warn(`❌ [SECURITY] Missing webhook data from IP: ${clientIP}`);
        throw new UnauthorizedException('Missing webhook data');
      }

      // 3. Validar API Key en el webhook
      const providedApiKey = webhookData.apikey;
      if (!providedApiKey) {
        this.logger.warn(`❌ [SECURITY] Missing API key in webhook from IP: ${clientIP}`);
        throw new UnauthorizedException('Missing API key in webhook');
      }

      this.logger.debug(`🔑 API Key provided: ${providedApiKey?.substring(0, 10)}...`);

      // 4. Validar contra API Key específica de instancia (PRIORITARIO)
      const instanceName = webhookData.instance;
      if (instanceName) {
        try {
          const instance = await this.instanceRepository.findOne({
            where: { instanceKey: instanceName },
            select: ['id', 'name', 'apiKey', 'instanceKey']
          });

          if (instance?.apiKey) {
            if (providedApiKey === instance.apiKey) {
              this.logger.debug(`✅ [AUTH] Webhook authorized with instance API Key: ${instance.name}`);
              return true;
            } else {
              this.logger.warn(`❌ [SECURITY] Invalid instance API Key for ${instance.name}`);
              this.logger.debug(`Expected: ${instance.apiKey?.substring(0, 10)}...`);
              this.logger.debug(`Provided: ${providedApiKey?.substring(0, 10)}...`);
            }
          } else {
            this.logger.warn(`⚠️ Instance ${instanceName} found but has no API Key configured`);
          }
        } catch (dbError) {
          this.logger.error(`❌ Database error checking instance: ${dbError.message}`);
        }
      } else {
        this.logger.debug(`ℹ️ No instance name in webhook, checking global API Key`);
      }

      // 5. Validar contra API Key global (FALLBACK)
      if (providedApiKey === this.globalApiKey) {
        this.logger.debug(`✅ [AUTH] Webhook authorized with global API Key`);
        return true;
      }

      // 6. Validar signature HMAC si está configurada
      if (this.webhookSecret) {
        const signature = request.headers['x-webhook-signature'] as string || 
                         request.headers['x-signature'] as string ||
                         request.headers['signature'] as string;
        
        if (signature) {
          if (this.validateSignature(webhookData, signature)) {
            this.logger.debug(`✅ [AUTH] Webhook authorized with HMAC signature`);
            return true;
          } else {
            this.logger.warn(`❌ [SECURITY] Invalid HMAC signature`);
          }
        }
      }

      // 7. Validar que viene de Evolution API conocida
      const serverUrl = webhookData.server_url;
      if (serverUrl) {
        const allowedServers = [
          'http://localhost:8080',
          'http://evolution-api:8080',
          'http://127.0.0.1:8080',
          this.configService.get('EVOLUTION_API_URL')
        ].filter(Boolean);
        
        if (allowedServers.includes(serverUrl)) {
          this.logger.debug(`✅ [AUTH] Webhook from known Evolution server: ${serverUrl}`);
          // Aún necesita API Key válida, pero es un indicador positivo
        } else {
          this.logger.warn(`❌ [SECURITY] Unknown server URL: ${serverUrl}`);
        }
      }

      // Si llegamos aquí, ninguna validación pasó
      this.logger.warn(`❌ [SECURITY] Webhook not authorized from IP ${clientIP}`);
      this.logger.debug(`❌ Failed validations: Instance API Key, Global API Key, HMAC Signature`);
      throw new UnauthorizedException('Webhook not authorized - invalid credentials');

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`❌ [ERROR] Webhook security check failed: ${error.message}`);
      throw new UnauthorizedException('Webhook security validation failed');
    }
  }

  /**
   * 🔧 MEJORADO: Obtener IP real del cliente considerando proxies y Docker
   */
  private getClientIP(request: Request): string {
    // Headers comunes de proxies y load balancers
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Tomar la primera IP (más cercana al cliente original)
      const firstIP = forwardedFor.split(',')[0].trim();
      if (firstIP) return this.normalizeIP(firstIP);
    }
    
    const realIP = request.headers['x-real-ip'] as string;
    if (realIP) {
      return this.normalizeIP(realIP);
    }

    const cfConnectingIP = request.headers['cf-connecting-ip'] as string; // Cloudflare
    if (cfConnectingIP) {
      return this.normalizeIP(cfConnectingIP);
    }

    // IP de conexión directa
    let clientIP = request.ip || request.connection?.remoteAddress || request.socket?.remoteAddress || 'unknown';
    
    return this.normalizeIP(clientIP);
  }

  /**
   * 🔧 NUEVO: Normalizar formato de IP
   */
  private normalizeIP(ip: string): string {
    if (!ip || ip === 'unknown') return ip;
    
    // Limpiar formato IPv6 mapped IPv4 (::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    
    // Limpiar formato IPv6 localhost (::1 -> ::1)
    if (ip === '::1') {
      return 'localhost';
    }
    
    return ip.trim();
  }

  /**
   * 🔧 MEJORADO: Verificar si la IP está permitida (más específico para Docker)
   */
  private isAllowedIP(clientIP: string): boolean {
    if (!clientIP || clientIP === 'unknown') {
      this.logger.warn(`⚠️ Unknown client IP`);
      return false;
    }

    // 1. IPs exactas
    if (this.allowedIPs.includes(clientIP)) {
      this.logger.debug(`✅ IP match (exact): ${clientIP}`);
      return true;
    }

    // 2. Localhost especiales
    const localhostIPs = ['127.0.0.1', '::1', 'localhost'];
    if (this.allowedIPs.includes('localhost') && localhostIPs.includes(clientIP)) {
      this.logger.debug(`✅ IP match (localhost): ${clientIP}`);
      return true;
    }

    // 3. host.docker.internal especial
    if (this.allowedIPs.includes('host.docker.internal')) {
      // Docker Desktop puede enviar desde diferentes IPs
      const dockerDesktopIPs = ['host.docker.internal', '192.168.65.1', '192.168.65.2'];
      if (dockerDesktopIPs.includes(clientIP)) {
        this.logger.debug(`✅ IP match (docker-desktop): ${clientIP}`);
        return true;
      }
    }

    // 4. Rangos de Docker Bridge Networks
    const dockerBridgeRanges = [
      '172.17.0.',   // Docker default bridge
      '172.18.0.',   // Docker custom bridge
      '172.19.0.',   // Docker custom bridge
      '172.20.0.',   // Docker custom bridge
    ];

    for (const range of dockerBridgeRanges) {
      const allowedRange = this.allowedIPs.find(ip => ip.startsWith(range.slice(0, -1)));
      if (allowedRange && clientIP.startsWith(range)) {
        this.logger.debug(`✅ IP match (docker-bridge): ${clientIP} in range ${range}x`);
        return true;
      }
    }

    // 5. Rangos privados si están explícitamente permitidos
    if (this.allowedIPs.some(ip => ip.includes('192.168.'))) {
      if (clientIP.startsWith('192.168.')) {
        // Verificar que el rango específico esté permitido
        const ipParts = clientIP.split('.');
        const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.`;
        
        if (this.allowedIPs.some(allowedIP => allowedIP.startsWith(subnet))) {
          this.logger.debug(`✅ IP match (private-range): ${clientIP}`);
          return true;
        }
      }
    }

    this.logger.debug(`❌ IP not allowed: ${clientIP}`);
    this.logger.debug(`🔍 Checked against: ${this.allowedIPs.join(', ')}`);
    return false;
  }

  /**
   * 🔧 MEJORADO: Validar signature HMAC
   */
  private validateSignature(body: any, signature: string): boolean {
    if (!this.webhookSecret || !signature) {
      return false;
    }
    
    try {
      const crypto = require('crypto');
      
      // Crear payload consistente
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      
      // Calcular signature esperada
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');
      
      // Limpiar signature proporcionada
      const providedSignature = signature.replace(/^(sha256=|sha1=)/, '').toLowerCase();
      const expectedSig = expectedSignature.toLowerCase();
      
      // Comparación segura contra timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
      
      if (!isValid) {
        this.logger.debug(`❌ HMAC signature mismatch`);
        this.logger.debug(`Expected: ${expectedSig.substring(0, 16)}...`);
        this.logger.debug(`Provided: ${providedSignature.substring(0, 16)}...`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`❌ Error validating HMAC signature: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔧 NUEVO: Obtener información de debugging
   */
  private getDebugInfo(request: Request): object {
    return {
      ip: this.getClientIP(request),
      userAgent: request.headers['user-agent'],
      contentType: request.headers['content-type'],
      contentLength: request.headers['content-length'],
      headers: {
        'x-forwarded-for': request.headers['x-forwarded-for'],
        'x-real-ip': request.headers['x-real-ip'],
        'cf-connecting-ip': request.headers['cf-connecting-ip'],
      },
      timestamp: new Date().toISOString(),
    };
  }
}