// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const tokens = await this.authService.register(registerDto);
    return {
      message: 'Registration successful',
      data: tokens,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(loginDto);
    return {
      message: 'Login successful',
      data: tokens,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    // TODO: Implementar validación del refresh token
    // Por enquanto, vamos decodificar e gerar novos tokens
    const decoded = this.authService['jwtService'].decode(refreshDto.refreshToken) as any;
    const tokens = await this.authService.refreshTokens(decoded.sub);
    return {
      message: 'Tokens refreshed successfully',
      data: tokens,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getUserProfile(user.userId);
    return {
      message: 'Profile retrieved successfully',
      data: profile,
    };
  }
}