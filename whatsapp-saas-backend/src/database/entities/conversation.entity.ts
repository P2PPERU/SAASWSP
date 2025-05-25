// src/database/entities/conversation.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WhatsAppInstance } from './whatsapp-instance.entity';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  CLOSED = 'closed',
}

@Entity('conversations')
export class Conversation extends BaseEntity {
  @Column()
  contactNumber: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column()
  instanceId: string;

  @ManyToOne(() => WhatsAppInstance)
  @JoinColumn({ name: 'instanceId' })
  instance: WhatsAppInstance;
}