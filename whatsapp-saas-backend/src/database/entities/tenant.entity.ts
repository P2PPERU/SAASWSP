// src/database/entities/tenant.entity.ts
import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum TenantPlan {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.BASIC,
  })
  plan: TenantPlan;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  limits: {
    maxUsers?: number;
    maxInstances?: number;
    maxMessages?: number;
    maxConversations?: number;
  };
}