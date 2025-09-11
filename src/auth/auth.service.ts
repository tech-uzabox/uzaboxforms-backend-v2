import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RoleStatus } from 'db';
import { User } from 'db/client';
import { Request } from 'express';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { OtpService } from '../otp/otp.service';
import { RoleService } from '../role/role.service';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/register-user.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private auditLogService: AuditLogService,
    private roleService: RoleService,
    private userRoleService: UserRoleService,
    private otpService: OtpService,
  ) {}

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessTokenExpirationTime',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshTokenExpirationTime',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User, req: Request) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const tokens = await this.generateTokens(payload);

    await this.auditLogService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'Auth',
      status: 'SUCCESS',
    });

    return tokens;
  }

  async register(dto: RegisterUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use.');
    }

    const newUser = await this.userService.create(dto);

    // Assign 'PENDING' role to the new user
    let pendingRole = await this.roleService.findOneByName('PENDING');
    if (!pendingRole) {
      pendingRole = await this.roleService.create({
        name: 'PENDING',
        description: 'User awaiting email verification',
        status: RoleStatus.ENABLED,
      });
    }

    await this.userRoleService.create(newUser.id, pendingRole.id);

    await this.auditLogService.log({
      userId: newUser.id,
      action: 'USER_REGISTRATION_SUCCESS',
      resource: 'User',
      resourceId: newUser.id,
      status: 'SUCCESS',
      details: {
        email: newUser.email,
      },
    });

    const { password, ...result } = newUser;
    return result;
  }

  async googleLogin(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!user) {
      throw new UnauthorizedException('No user from Google');
    }

    let existingUser = await this.userService.findByEmail(user.email);

    if (!existingUser) {
      // Create a new user if not found
      existingUser = await this.userService.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: Math.random().toString(36).slice(-8), // Generate a random password for Google users
        googleId: user.id, // Store Google ID
      });

      // Assign a default role (e.g., 'USER') to the new Google user
      let userRole = await this.roleService.findOneByName('USER');
      if (!userRole) {
        userRole = await this.roleService.create({
          name: 'USER',
          description: 'Standard User',
          status: RoleStatus.ENABLED,
        });
      }
      await this.userRoleService.create(existingUser.id, userRole.id);
    }

    const payload: JwtPayload = {
      sub: existingUser.id,
      email: existingUser.email,
    };
    const tokens = await this.generateTokens(payload);

    return tokens;
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User with this email does not exist.');
    }
    return this.otpService.generateOtp(email);
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.otpService.validateOtp(email, otp);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User with this email does not exist.');
    }

    await this.userService.update(user.id, { password: newPassword });

    return { message: 'Password reset successfully.' };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.secret'), // Use same secret or dedicated refresh token secret
        },
      );

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException(
          'Invalid refresh token: user not found.',
        );
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };
      const tokens = await this.generateTokens(newPayload);

      return tokens;
    } catch (error) {
      this.logger.warn(`Refresh token validation failed: ${error.message}`);
      throw error;
    }
  }
}
