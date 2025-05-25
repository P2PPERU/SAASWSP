// src/modules/tenant/tenant.controller.ts
import { 
  Controller, 
  Get, 
  Put, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateTenantDto, UpdateTenantSettingsDto } from './dto/tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get()
  async getCurrentTenant(@CurrentUser() user: any) {
    const tenant = await this.tenantService.findOne(user.tenantId);
    return {
      message: 'Tenant retrieved successfully',
      data: tenant,
    };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateCurrentTenant(
    @CurrentUser() user: any,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    const tenant = await this.tenantService.update(user.tenantId, updateTenantDto);
    return {
      message: 'Tenant updated successfully',
      data: tenant,
    };
  }

  @Get('settings')
  async getTenantSettings(@CurrentUser() user: any) {
    const tenant = await this.tenantService.findOne(user.tenantId);
    return {
      message: 'Settings retrieved successfully',
      data: tenant.settings,
    };
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateTenantSettings(
    @CurrentUser() user: any,
    @Body() settingsDto: UpdateTenantSettingsDto,
  ) {
    const tenant = await this.tenantService.updateSettings(user.tenantId, settingsDto);
    return {
      message: 'Settings updated successfully',
      data: tenant.settings,
    };
  }

  @Get('usage')
  async getCurrentTenantUsage(@CurrentUser() user: any) {
    const usage = await this.tenantService.getUsageStats(user.tenantId);
    return {
      message: 'Usage stats retrieved successfully',
      data: usage,
    };
  }

  @Get('users')
  async getTenantUsers(@CurrentUser() user: any) {
    const users = await this.tenantService.getUsers(user.tenantId);
    return {
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  @Get('dashboard')
  async getDashboardStats(@CurrentUser() user: any) {
    const stats = await this.tenantService.getDashboardStats(user.tenantId);
    return {
      message: 'Dashboard stats retrieved successfully',
      data: stats,
    };
  }
}