// src/database/entities/whatsapp-instance.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

export enum InstanceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

@Entity('whatsapp_instances')
export class WhatsAppInstance extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  instanceKey: string;

  // NUEVO: Guardar la API Key única de la instancia
  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: InstanceStatus,
    default: InstanceStatus.DISCONNECTED,
  })
  status: InstanceStatus;

  @Column({ nullable: true, type: 'text' })
  qrCode: string;

  @Column({ nullable: true })
  lastConnectionAt: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}