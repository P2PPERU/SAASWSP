// src/modules/whatsapp/services/sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppInstance, InstanceStatus } from '../../../database/entities';
import { EvolutionApiService } from './evolution-api.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private syncInProgress = false;

  constructor(
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
    private evolutionApiService: EvolutionApiService,
  ) {}

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
      // 1. Obtener instancias de Evolution API
      const evolutionInstances = await this.evolutionApiService.fetchInstances();
      this.logger.log(`Found ${evolutionInstances.length} instances in Evolution API`);

      // 2. Obtener instancias locales
      const localInstances = await this.instanceRepository.find();
      const localInstancesMap = new Map(
        localInstances.map(inst => [inst.instanceKey, inst])
      );

      // 3. Sincronizar cada instancia de Evolution
      for (const evoInst of evolutionInstances) {
        const instanceKey = evoInst.name || evoInst.instanceName;
        const localInstance = localInstancesMap.get(instanceKey);

        if (!localInstance) {
          // Nueva instancia detectada en Evolution
          this.logger.warn(`Nueva instancia detectada: ${instanceKey}`);
          // TODO: Decidir si importar automáticamente o notificar
          continue;
        }

        // Actualizar estado
        const connectionStatus = evoInst.connectionStatus || 'disconnected';
        const newStatus = this.mapEvolutionStatusToLocal(connectionStatus);

        if (localInstance.status !== newStatus) {
          this.logger.log(`Actualizando estado de ${instanceKey}: ${localInstance.status} -> ${newStatus}`);
          localInstance.status = newStatus;
          
          if (newStatus === InstanceStatus.CONNECTED) {
            localInstance.lastConnectionAt = new Date();
            localInstance.phoneNumber = evoInst.ownerJid?.replace('@s.whatsapp.net', '');
          }

          await this.instanceRepository.save(localInstance);
        }
      }

      // 4. Marcar instancias locales que no existen en Evolution
      for (const localInstance of localInstances) {
        const existsInEvolution = evolutionInstances.some(
          evo => (evo.name || evo.instanceName) === localInstance.instanceKey
        );

        if (!existsInEvolution && localInstance.status !== InstanceStatus.DISCONNECTED) {
          this.logger.warn(`Instancia ${localInstance.instanceKey} no encontrada en Evolution`);
          localInstance.status = InstanceStatus.DISCONNECTED;
          await this.instanceRepository.save(localInstance);
        }
      }

      this.logger.log('✅ Sincronización completada');
    } catch (error) {
      this.logger.error('Error durante sincronización:', error);
    }
  }

  /**
   * Mapear estados de Evolution a estados locales (usando enum)
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

    try {
      const status = await this.evolutionApiService.getInstanceStatus(instance.instanceKey);
      
      const newStatus = this.mapEvolutionStatusToLocal(status.instance?.state || 'close');
      
      if (instance.status !== newStatus) {
        instance.status = newStatus;
        
        if (status.instance?.profileName) {
          instance.phoneNumber = status.instance.profileName;
        }
        
        if (newStatus === InstanceStatus.CONNECTED) {
          instance.lastConnectionAt = new Date();
        }
        
        await this.instanceRepository.save(instance);
        this.logger.log(`Instancia ${instance.name} sincronizada: ${newStatus}`);
      }
    } catch (error) {
      this.logger.error(`Error sincronizando instancia ${instance.name}:`, error);
      throw error;
    }
  }
}