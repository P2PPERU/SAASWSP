// src/modules/whatsapp/services/sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppInstance, InstanceStatus } from '../../../database/entities';
import { EvolutionApiService } from './evolution-api.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private syncInProgress = false;
  private readonly globalApiKey: string;

  constructor(
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
    private evolutionApiService: EvolutionApiService,
    private configService: ConfigService,
  ) {
    this.globalApiKey = this.configService.get<string>('EVOLUTION_API_KEY', '');
  }

  /**
   * Sincronización automática cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleInstanceSync() {
    if (this.syncInProgress) {
      this.logger.warn('Sincronización ya en progreso, saltando...');
      return;
    }

    try {
      this.syncInProgress = true;
      await this.syncAllInstances();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincronizar todas las instancias
   */
  async syncAllInstances() {
    this.logger.log('🔄 Iniciando sincronización de instancias...');

    try {
      // 1. Obtener instancias locales activas
      const localInstances = await this.instanceRepository.find({
        where: { status: InstanceStatus.CONNECTED }
      });

      this.logger.log(`Sincronizando ${localInstances.length} instancias conectadas`);

      // 2. Sincronizar cada instancia usando su API Key específica
      for (const instance of localInstances) {
        try {
          // Verificar que tenga API Key
          if (!instance.apiKey) {
            this.logger.warn(`⚠️ Instancia ${instance.name} sin API Key, saltando...`);
            continue;
          }

          // Obtener estado actual usando la API Key específica
          const status = await this.evolutionApiService.getInstanceStatus(
            instance.instanceKey,
            instance.apiKey // <-- USAR API KEY ESPECÍFICA
          );
          
          const newStatus = this.mapEvolutionStatusToLocal(status.instance?.state || 'close');
          
          // Actualizar si cambió el estado
          if (instance.status !== newStatus) {
            this.logger.log(`📱 ${instance.name}: ${instance.status} -> ${newStatus}`);
            instance.status = newStatus;
            
            if (status.instance?.profileName) {
              instance.phoneNumber = status.instance.profileName;
            }
            
            if (newStatus === InstanceStatus.CONNECTED) {
              instance.lastConnectionAt = new Date();
            }
            
            await this.instanceRepository.save(instance);
          }
        } catch (error) {
          this.logger.error(`❌ Error sincronizando ${instance.name}: ${error.message}`);
          
          // Si falla la sincronización, marcar como desconectada
          if (error.response?.status === 401 || error.response?.status === 404) {
            instance.status = InstanceStatus.DISCONNECTED;
            await this.instanceRepository.save(instance);
          }
        }
      }

      this.logger.log('✅ Sincronización completada');
    } catch (error) {
      this.logger.error('❌ Error durante sincronización:', error);
    }
  }

  /**
   * Mapear estados de Evolution a estados locales
   */
  private mapEvolutionStatusToLocal(evolutionStatus: string): InstanceStatus {
    const statusMap: Record<string, InstanceStatus> = {
      'open': InstanceStatus.CONNECTED,
      'connecting': InstanceStatus.CONNECTING,
      'close': InstanceStatus.DISCONNECTED,
      'closed': InstanceStatus.DISCONNECTED,
    };

    return statusMap[evolutionStatus] || InstanceStatus.DISCONNECTED;
  }

  /**
   * Sincronización manual de una instancia específica
   */
  async syncInstance(instanceId: string): Promise<void> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId }
    });

    if (!instance) {
      throw new Error('Instancia no encontrada');
    }

    if (!instance.apiKey) {
      throw new Error(`Instancia ${instance.name} no tiene API Key configurada`);
    }

    try {
      const status = await this.evolutionApiService.getInstanceStatus(
        instance.instanceKey,
        instance.apiKey // <-- USAR API KEY ESPECÍFICA
      );
      
      const newStatus = this.mapEvolutionStatusToLocal(status.instance?.state || 'close');
      
      if (instance.status !== newStatus) {
        instance.status = newStatus;
        
        if (status.instance?.profileName) {
          instance.phoneNumber = status.instance.profileName;
        }
        
        if (newStatus === InstanceStatus.CONNECTED) {
          instance.lastConnectionAt = new Date();
          instance.qrCode = null; // Limpiar QR si está conectado
        }
        
        await this.instanceRepository.save(instance);
        this.logger.log(`✅ Instancia ${instance.name} sincronizada: ${newStatus}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error sincronizando instancia ${instance.name}:`, error);
      throw error;
    }
  }

  /**
   * Verificar y actualizar API Keys faltantes
   */
  async checkMissingApiKeys() {
    const instancesWithoutApiKey = await this.instanceRepository.find({
      where: { apiKey: null }
    });

    if (instancesWithoutApiKey.length === 0) {
      this.logger.log('✅ Todas las instancias tienen API Key');
      return;
    }

    this.logger.warn(`⚠️ ${instancesWithoutApiKey.length} instancias sin API Key`);

    // Intentar obtener las API Keys desde Evolution
    for (const instance of instancesWithoutApiKey) {
      try {
        // Usar la API Key global para buscar la instancia
        const instances = await this.evolutionApiService.fetchInstances(this.globalApiKey);
        const evolutionInstance = instances.find(
          (inst: any) => inst.instance?.instanceName === instance.instanceKey
        );

        if (evolutionInstance?.hash?.apikey) {
          instance.apiKey = evolutionInstance.hash.apikey;
          await this.instanceRepository.save(instance);
          this.logger.log(`✅ API Key recuperada para ${instance.name}`);
        } else {
          this.logger.warn(`⚠️ No se pudo recuperar API Key para ${instance.name}`);
        }
      } catch (error) {
        this.logger.error(`❌ Error recuperando API Key para ${instance.name}:`, error);
      }
    }
  }

  /**
   * Limpiar instancias huérfanas (existe en BD pero no en Evolution)
   */
  async cleanOrphanedInstances() {
    try {
      const allLocalInstances = await this.instanceRepository.find();
      const evolutionInstances = await this.evolutionApiService.fetchInstances(this.globalApiKey);
      
      const evolutionInstanceKeys = new Set(
        evolutionInstances.map((inst: any) => inst.instance?.instanceName || inst.name)
      );

      for (const localInstance of allLocalInstances) {
        if (!evolutionInstanceKeys.has(localInstance.instanceKey)) {
          this.logger.warn(`🗑️ Instancia huérfana detectada: ${localInstance.name}`);
          localInstance.status = InstanceStatus.DISCONNECTED;
          await this.instanceRepository.save(localInstance);
        }
      }
    } catch (error) {
      this.logger.error('Error limpiando instancias huérfanas:', error);
    }
  }
}