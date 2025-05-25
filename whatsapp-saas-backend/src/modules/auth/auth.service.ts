// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload, JwtTokens } from './interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<JwtTokens> {
    const { email, password, name, organizationName } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Crear tenant
    const tenant = this.tenantRepository.create({
      name: organizationName,
      settings: {
        aiEnabled: true,
        welcomeMessage: 'Olá! Como posso ajudar você hoje?',
      },
      limits: {
        maxUsers: 5,
        maxInstances: 1,
        maxMessages: 1000,
        maxConversations: 100,
      },
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      tenantId: savedTenant.id,
    });

    const savedUser = await this.userRepository.save(user);

    // Gerar tokens
    return this.generateTokens(savedUser);
  }

  async login(loginDto: LoginDto): Promise<JwtTokens> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Atualizar último login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshTokens(userId: string): Promise<JwtTokens> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: User): JwtTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
      select: ['id', 'email', 'name', 'role', 'createdAt', 'tenantId'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
        status: user.tenant.status,
      },
    };
  }
}