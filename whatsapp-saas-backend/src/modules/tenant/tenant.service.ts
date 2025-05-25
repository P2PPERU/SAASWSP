// src/modules/tenant/tenant.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantPlan } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { WhatsAppInstance, InstanceStatus } from '../../database/entities/whatsapp-instance.entity';
import { Message } from '../../database/entities/message.entity';
import { Conversation, ConversationStatus } from '../../database/entities/conversation.entity';
import { UpdateTenantDto, UpdateTenantSettingsDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(WhatsAppInstance)
    private instanceRepository: Repository<WhatsAppInstance>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Verificar si el nombre ya existe (si está siendo actualizado)
    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: updateTenantDto.name },
      });
      if (existingTenant) {
        throw new BadRequestException('A tenant with this name already exists');
      }
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async updateSettings(id: string, settings: UpdateTenantSettingsDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    
    tenant.settings = {
      ...tenant.settings,
      ...settings,
    };

    return this.tenantRepository.save(tenant);
  }

  async getUsageStats(id: string) {
    const tenant = await this.findOne(id);

    // Contar usuarios ativos
    const userCount = await this.userRepository.count({
      where: { tenantId: id },
    });

    // Contar instâncias WhatsApp
    const instanceCount = await this.instanceRepository.count({
      where: { tenantId: id },
    });

    // Contar mensagens do mês atual
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const messageCount = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId: id })
      .andWhere('message.createdAt >= :startDate', { startDate: currentMonth })
      .getCount();

    // Contar conversas ativas
    const conversationCount = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId: id })
      .andWhere('conversation.status = :status', { status: ConversationStatus.ACTIVE })
      .getCount();

    // Calcular limites
    const limits = {
      users: tenant.limits.maxUsers || 5,
      instances: tenant.limits.maxInstances || 1,
      messages: tenant.limits.maxMessages || 1000,
      conversations: tenant.limits.maxConversations || 100,
    };

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status,
      },
      usage: {
        users: {
          current: userCount,
          limit: limits.users,
          percentage: Math.round((userCount / limits.users) * 100),
        },
        instances: {
          current: instanceCount,
          limit: limits.instances,
          percentage: Math.round((instanceCount / limits.instances) * 100),
        },
        messages: {
          current: messageCount,
          limit: limits.messages,
          percentage: Math.round((messageCount / limits.messages) * 100),
        },
        conversations: {
          current: conversationCount,
          limit: limits.conversations,
          percentage: Math.round((conversationCount / limits.conversations) * 100),
        },
      },
      period: {
        start: currentMonth.toISOString(),
        end: new Date().toISOString(),
      },
    };
  }

  async checkLimit(tenantId: string, limitType: 'users' | 'instances' | 'messages' | 'conversations'): Promise<boolean> {
    const stats = await this.getUsageStats(tenantId);
    const usage = stats.usage[limitType];
    return usage.current < usage.limit;
  }

  async getUsers(tenantId: string) {
    return this.userRepository.find({
      where: { tenantId },
      select: ['id', 'email', 'name', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDashboardStats(tenantId: string) {
    const stats = await this.getUsageStats(tenantId);
    
    // Mensagens dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMessages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.instance', 'instance')
      .where('instance.tenantId = :tenantId', { tenantId })
      .andWhere('message.createdAt >= :date', { date: sevenDaysAgo })
      .select('DATE(message.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('message.direction', 'direction')
      .groupBy('DATE(message.createdAt)')
      .addGroupBy('message.direction')
      .getRawMany();

    // Instâncias conectadas
    const connectedInstances = await this.instanceRepository.count({
      where: { tenantId, status: InstanceStatus.CONNECTED },
    });

    return {
      ...stats,
      overview: {
        totalUsers: stats.usage.users.current,
        totalInstances: stats.usage.instances.current,
        connectedInstances,
        totalMessages: stats.usage.messages.current,
        activeConversations: stats.usage.conversations.current,
      },
      messageChart: recentMessages,
    };
  }
}