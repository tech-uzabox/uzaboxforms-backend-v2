import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from 'db/client';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './decorators/get-user.decorator';
import { GetUser } from './decorators/get-user.decorator';

import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (ENTITY_OWNER)' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(
    @Body(new ZodValidationPipe(RegisterUserDto))
    registerUserDto: RegisterUserDto,
  ): Promise<Omit<User, 'password'>> {
    return this.authService.register(registerUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access and refresh tokens.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified.',
  })
  async login(@Req() req: Request & { user: User }) {
    return this.authService.login(req.user, req);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refreshToken(
    @Body(new ZodValidationPipe(RefreshTokenDto)) dto: RefreshTokenDto,
  ) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@GetUser() user: AuthenticatedUser) {
    return user;
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth2 callback' })
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request & { user: User }, @Res() res: Response) {
    try {
      const tokens = await this.authService.googleLogin(req.user);

      // Set JWT tokens in cookies (httpOnly: true for security)
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000, // 15 minutes
        sameSite: 'lax',
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
      });

      // Redirect to frontend success URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}`);
    } catch (error) {
      // Redirect to frontend login page on failure
      const loginUrl = process.env.FRONTEND_LOGIN_URL || 'http://localhost:3001/auth/login';
      res.redirect(`${loginUrl}?error=google_auth_failed`);
    }
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid email.' })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(RequestPasswordResetDto))
    dto: RequestPasswordResetDto,
  ) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or email.' })
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordDto))
    dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully.' })
  async logout(@Res() res: Response) {
    // Clear JWT cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Return success response
    res.status(HttpStatus.OK).json({ message: 'Logged out successfully' });
  }
}
