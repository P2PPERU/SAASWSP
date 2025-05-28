// src/types/auth.types.ts

import type { Tenant } from '@/services/tenant.service'

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenantId: string;
  tenant?: Tenant;           // <-- Aquí el cambio para usar toda la estructura (incluye limits, settings, etc)
  createdAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  message: string;
  data: AuthTokens;
}

export interface ProfileResponse {
  message: string;
  data: User;
}
