// src/modules/tenant/dto/tenant.dto.ts
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { TenantPlan, TenantStatus } from '../../../database/entities/tenant.entity';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  settings?: {
    aiEnabled?: boolean;
    welcomeMessage?: string;
    businessHours?: string;
    autoReplyDelay?: number;
    [key: string]: any;
  };
}

export class UpdateTenantSettingsDto {
  @IsOptional()
  aiEnabled?: boolean;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsString()
  @IsOptional()
  businessHours?: string;

  @IsOptional()
  autoReplyDelay?: number;
}

export class UpdateTenantPlanDto {
  @IsEnum(TenantPlan)
  plan: TenantPlan;
}

export class TenantUsageDto {
  users: {
    current: number;
    limit: number;
    percentage: number;
  };
  instances: {
    current: number;
    limit: number;
    percentage: number;
  };
  messages: {
    current: number;
    limit: number;
    percentage: number;
  };
  conversations: {
    current: number;
    limit: number;
    percentage: number;
  };
}