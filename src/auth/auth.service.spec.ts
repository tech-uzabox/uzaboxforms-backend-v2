import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role, RoleStatus, User, UserStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { OtpService } from '../otp/otp.service';
import { RoleService } from '../role/role.service';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockUser: User = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'test@example.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: UserStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRole: Role = {
  id: 'role-id-1',
  name: 'PENDING',
  description: 'User awaiting email verification',
  status: RoleStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserRole: Role = {
  id: 'role-id-2',
  name: 'USER',
  description: 'Standard User',
  status: RoleStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockRoleService = {
  findOneByName: jest.fn(),
  create: jest.fn(),
};

const mockUserRoleService = {
  create: jest.fn(),
};

const mockOtpService = {
  generateOtp: jest.fn(),
  validateOtp: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RoleService, useValue: mockRoleService },
        { provide: UserRoleService, useValue: mockUserRoleService },
        { provide: OtpService, useValue: mockOtpService },
        {
          provide: Logger,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        }, // Mock Logger
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if validation is successful', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user and assign PENDING role', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123' };
      const createdUser = { ...mockUser, email: 'new@example.com' };
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockRoleService.findOneByName.mockResolvedValue(mockRole);
      mockUserRoleService.create.mockResolvedValue({});

      const result = await service.register(registerDto);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = createdUser;
      expect(result).toEqual(expectedResult);
      expect(mockUserRoleService.create).toHaveBeenCalledWith(
        createdUser.id,
        mockRole.id,
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: createdUser.id,
        action: 'USER_REGISTRATION_SUCCESS',
        resource: 'User',
        resourceId: createdUser.id,
        status: 'SUCCESS',
        details: {
          email: createdUser.email,
        },
      });
    });

    it('should create PENDING role if it does not exist', async () => {
      const registerDto = {
        email: 'new@example.example.com',
        password: 'password123',
      };
      const createdUser = { ...mockUser, email: 'new@example.example.com' };
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockRoleService.findOneByName.mockResolvedValue(null);
      mockRoleService.create.mockResolvedValue(mockRole);
      mockUserRoleService.create.mockResolvedValue({});

      await service.register(registerDto);
      expect(mockRoleService.create).toHaveBeenCalledWith({
        name: 'PENDING',
        description: 'User awaiting email verification',
        status: RoleStatus.ENABLED,
      });
      expect(mockUserRoleService.create).toHaveBeenCalledWith(
        createdUser.id,
        mockRole.id,
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: createdUser.id,
        action: 'USER_REGISTRATION_SUCCESS',
        resource: 'User',
        resourceId: createdUser.id,
        status: 'SUCCESS',
        details: {
          email: createdUser.email,
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.signAsync.mockResolvedValue('sometoken');
      const result = await service.login(mockUser, {} as any);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'USER_LOGIN',
        resource: 'Auth',
        status: 'SUCCESS',
      });
    });
  });

  describe('googleLogin', () => {
    it('should return tokens for an existing Google user', async () => {
      const googleUser = {
        id: 'google-id-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.signAsync.mockResolvedValue('sometoken');

      const result = await service.googleLogin(googleUser);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        googleUser.email,
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should create a new user and return tokens for a new Google user', async () => {
      const googleUser = {
        id: 'google-id-2',
        email: 'newgoogle@example.com',
        firstName: 'New',
        lastName: 'Google',
      };
      const createdGoogleUser = {
        ...mockUser,
        id: 'new-google-user-id',
        email: 'newgoogle@example.com',
      };
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdGoogleUser);
      mockRoleService.findOneByName.mockResolvedValue(mockUserRole);
      mockUserRoleService.create.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.signAsync.mockResolvedValue('sometoken');

      const result = await service.googleLogin(googleUser);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        googleUser.email,
      );
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        password: expect.any(String),
        googleId: googleUser.id,
      });
      expect(mockUserRoleService.create).toHaveBeenCalledWith(
        createdGoogleUser.id,
        mockUserRole.id,
      );
    });

    it('should throw UnauthorizedException if no user from Google', async () => {
      await expect(service.googleLogin(null)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate and send OTP for password reset', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockOtpService.generateOtp.mockResolvedValue({
        message: 'OTP sent successfully',
      });

      const result = await service.requestPasswordReset('test@example.com');
      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should throw BadRequestException if user does not exist for password reset', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nonexistent@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockOtpService.validateOtp.mockResolvedValue({
        message: 'OTP validated successfully',
      });
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue({
        ...mockUser,
        password: 'newhashedpassword',
      });

      const result = await service.resetPassword(
        'test@example.com',
        '123456',
        'newpassword',
      );
      expect(result).toEqual({ message: 'Password reset successfully.' });
      expect(mockOtpService.validateOtp).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserService.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'newpassword',
      });
    });

    it('should throw BadRequestException if user does not exist for password reset', async () => {
      mockOtpService.validateOtp.mockResolvedValue({
        message: 'OTP validated successfully',
      });
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword(
          'nonexistent@example.com',
          '123456',
          'newpassword',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP validation fails', async () => {
      mockOtpService.validateOtp.mockRejectedValue(
        new BadRequestException('Invalid OTP or email.'),
      );

      await expect(
        service.resetPassword('test@example.com', 'wrongotp', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new access and refresh tokens', async () => {
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockUserService.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('newtoken');

      const result = await service.refreshTokens('oldrefreshtoken');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'nonexistent-id',
        email: 'nonexistent@example.com',
      });
      mockUserService.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('oldrefreshtoken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if refresh token is invalid', async () => {
      mockConfigService.get.mockReturnValue('jwtsecret');
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('invalidtoken')).rejects.toThrow(
        'Invalid token',
      );
    });
  });
});
