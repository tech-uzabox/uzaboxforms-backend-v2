import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
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
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { RegisterUserDto } from './dto/register-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthenticatedUser } from './decorators/get-user.decorator';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ValidateEmailDto } from './dto/validate-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';

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
  ) {
    const user = await this.authService.register(registerUserDto);
    return {
      success: true,
      userId: user.id,
      user,
    };
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
  async login(@Req() req: Request & { user: User }, @Res() res: Response) {
    const tokens = await this.authService.login(req.user, req);

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

    return res.json(tokens);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token from cookies' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refreshToken(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Set new JWT tokens in cookies
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

    return res.json(tokens);
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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}`);
    } catch (error) {
      // Redirect to frontend login page on failure
      const loginUrl = process.env.FRONTEND_LOGIN_URL || 'http://localhost:5/auth/login';
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

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid current password or user not found.' })
  async changePassword(
    @Body(new ZodValidationPipe(ChangePasswordDto)) dto: ChangePasswordDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('validate/email')
  @ApiOperation({ summary: 'Validate email with OTP' })
  @ApiResponse({ status: 200, description: 'Email validated and role assigned.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or user not found.' })
  async validateEmail(
    @Body(new ZodValidationPipe(ValidateEmailDto)) dto: ValidateEmailDto,
  ) {
    return this.authService.validateEmail(dto.email, dto.otp);
  }

  @Post('validate/token')
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid.' })
  @ApiResponse({ status: 401, description: 'Invalid token.' })
  async validateToken(
    @Body(new ZodValidationPipe(ValidateTokenDto)) dto: ValidateTokenDto,
  ) {
    return this.authService.validateToken(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateProfile(
    @GetUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(UpdateProfileDto)) dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Get('google/failed')
  @ApiOperation({ summary: 'Google OAuth failure redirect' })
  @ApiResponse({ status: 200, description: 'Google authentication failed.' })
  async googleAuthFailed(@Res() res: Response) {
    // Redirect to frontend failure URL
    const loginUrl = process.env.FRONTEND_LOGIN_URL || 'http://localhost:3001/auth/login';
    res.redirect(`${loginUrl}?error=google_auth_failed`);
  }
}
