// src/services/auth.service.ts
import { api } from '@/lib/api-client';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse, 
  ProfileResponse,
  AuthTokens 
} from '@/types/auth.types';

class AuthService {
  private readonly basePath = '/auth';

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post(`${this.basePath}/login`, data);
    this.saveTokens(response.data.data);
    return response.data;
  }

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post(`${this.basePath}/register`, data);
    this.saveTokens(response.data.data);
    return response.data;
  }

  async getProfile(): Promise<ProfileResponse> {
    const response = await api.get(`${this.basePath}/me`);
    return response.data;
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post(`${this.basePath}/refresh`, { refreshToken });
    this.saveTokens(response.data.data);
    return response.data.data;
  }

  logout() {
    this.clearTokens();
    // Redirigir a login se manejará en el store
  }

  // Token management
  private saveTokens(tokens: AuthTokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();