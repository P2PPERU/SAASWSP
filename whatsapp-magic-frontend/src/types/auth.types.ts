// src/types/auth.types.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    plan: 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended';
  };
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