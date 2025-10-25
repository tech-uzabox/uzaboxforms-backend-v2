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
import { RoleStatus, User } from 'db/client';
import { Request } from 'express';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { OtpService } from '../otp/otp.service';
import { RoleService } from '../role/role.service';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    
    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_ATTEMPT_LOCKED_ACCOUNT',
        resource: 'Auth',
        status: 'FAILURE',
        details: {
          email: user.email,
          lockedUntil: user.lockedUntil,
        },
      });
      throw new UnauthorizedException('Account is locked due to multiple failed login attempts. Please try again later.');
    }

    // If lockout period has expired, reset the lockout
    if (user.isLocked && user.lockedUntil && new Date() >= user.lockedUntil) {
      await this.userService.update(user.id, {
        isLocked: false,
        lockedUntil: null,
        failedLoginAttempts: 0,
      });
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    
    if (isPasswordValid) {
      // Reset failed attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await this.userService.update(user.id, {
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
        });
      }
      
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_ATTEMPT_SUCCESS',
        resource: 'Auth',
        status: 'SUCCESS',
        details: {
          email: user.email,
        },
      });
      
      return user;
    } else {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      const lockoutDuration = 1 * 60 * 1000; // 1 minute
      
      let updateData: any = {
        failedLoginAttempts: newFailedAttempts,
      };
      
      // Lock account if max attempts reached
      if (newFailedAttempts >= maxAttempts) {
        const lockedUntil = new Date(Date.now() + lockoutDuration);
        updateData = {
          ...updateData,
          isLocked: true,
          lockedUntil: lockedUntil,
        };
        
        await this.auditLogService.log({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          resource: 'Auth',
          status: 'FAILURE',
          details: {
            email: user.email,
            failedAttempts: newFailedAttempts,
            lockedUntil: lockedUntil,
          },
        });
      }
      
      await this.userService.update(user.id, updateData);
      
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_ATTEMPT_FAILED',
        resource: 'Auth',
        status: 'FAILURE',
        details: {
          email: user.email,
          failedAttempts: newFailedAttempts,
          remainingAttempts: maxAttempts - newFailedAttempts,
        },
      });
      
      return null;
    }
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
      let userRole = await this.roleService.findOneByName('User');
      if (!userRole) {
        userRole = await this.roleService.create({
          name: 'User',
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
    return this.otpService.generateOtp(email, 'password_reset');
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.otpService.validateOtp(email, otp, 'password_reset');

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect.');
    }
    // Don't hash here - let the userService handle it
    await this.userService.update(userId, { password: newPassword });
    return { message: 'Password changed successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }
      const userRoles = await this.userRoleService.findByUserId(payload.sub);
      const roles = await Promise.all(
        userRoles.map(async (ur) => {
          const role = await this.roleService.findOne(ur.roleId);
          return {
            roleName: role?.name,
            status:
              role?.status === RoleStatus.ENABLED &&
              ur.status === RoleStatus.ENABLED
                ? 'ENABLED'
                : 'DISABLED',
          };
        }),
      );
      const { password, ...userWithoutPass } = user;
      return {
        success: true,
        message: 'Token is valid',
        user: userWithoutPass,
        roles,
      };
    } catch (error) {
      throw new BadRequestException('Unauthorized');
    }
  }

  async validateEmail(email: string, otp: string) {
    await this.otpService.validateOtp(email, otp);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let userRole = await this.roleService.findOneByName('USER');
    if (!userRole) {
      userRole = await this.roleService.create({
        name: 'USER',
        description: 'Standard User',
        status: RoleStatus.ENABLED,
      });
    }

    const pendingRole = await this.roleService.findOneByName('PENDING');
    if (pendingRole) {
      const existingPending = await this.userRoleService.findOne(
        user.id,
        pendingRole.id,
      );
      if (existingPending) {
        await this.userRoleService.remove(user.id, pendingRole.id);
      }
    }

    const existingUserRole = await this.userRoleService.findOne(
      user.id,
      userRole.id,
    );
    if (!existingUserRole) {
      await this.userRoleService.create(user.id, userRole.id);
    }

    return { success: true, message: 'Email verified and role assigned' };
  }

  async updateProfile(userId: string, profile: UpdateProfileDto) {
    const updateData: any = {};
    if (profile.firstName != null) updateData.firstName = profile.firstName;
    if (profile.lastName != null) updateData.lastName = profile.lastName;
    if (profile.photo !== undefined) updateData.photo = profile.photo;
    await this.userService.update(userId, updateData);
    const updated = await this.userService.findOne(userId);
    if (!updated) throw new BadRequestException('User not found after update');
    const { password, ...result } = updated;
    return result;
  }

  async unlockAccount(userId: string, adminUserId: string): Promise<{ message: string }> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (!user.isLocked) {
      throw new BadRequestException('Account is not locked.');
    }

    await this.userService.update(userId, {
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });

    await this.auditLogService.log({
      userId: adminUserId,
      action: 'ACCOUNT_UNLOCKED',
      resource: 'User',
      resourceId: userId,
      status: 'SUCCESS',
      details: {
        unlockedUserEmail: user.email,
        unlockedUserId: userId,
      },
    });

    return { message: 'Account unlocked successfully.' };
  }
}
