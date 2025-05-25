// src/modules/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string;
  role: string;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}