import { APP_PIPE } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

const mockUser: User = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'test@example.com',
  password: 'password',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: UserStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockUser),
  login: jest
    .fn()
    .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
  refreshTokens: jest
    .fn()
    .mockResolvedValue({
      accessToken: 'newaccess',
      refreshToken: 'newrefresh',
    }),
  googleLogin: jest
    .fn()
    .mockResolvedValue({
      accessToken: 'googleaccess',
      refreshToken: 'googlerefresh',
    }),
  requestPasswordReset: jest
    .fn()
    .mockResolvedValue({ message: 'OTP sent successfully' }),
  resetPassword: jest
    .fn()
    .mockResolvedValue({ message: 'Password reset successfully.' }),
};

// Mock Guards
class MockJwtAuthGuard {
  canActivate = jest.fn(() => true);
}
class MockLocalAuthGuard {
  canActivate = jest.fn(() => true);
}
class MockAuthGuard {
  canActivate = jest.fn(() => true);
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .overrideGuard(LocalAuthGuard)
      .useClass(MockLocalAuthGuard)
      .overrideGuard(AuthGuard('google'))
      .useClass(MockAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123' };
      expect(await controller.register(registerDto)).toEqual(mockUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw error if registration fails', async () => {
      const registerDto = { email: 'existing@example.com', password: 'password123' };
      mockAuthService.register.mockRejectedValue(new Error('Registration failed'));
      await expect(controller.register(registerDto)).rejects.toThrow('Registration failed');
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should log in a user', async () => {
      const req = { user: mockUser } as any;
      expect(await controller.login(req)).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, req);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const refreshTokenDto = { refreshToken: 'oldrefresh' };
      expect(await controller.refreshToken(refreshTokenDto)).toEqual({
        accessToken: 'newaccess',
        refreshToken: 'newrefresh',
      });
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });
  });

  describe('getProfile', () => {
    it('should return the user profile', () => {
      const user = { sub: mockUser.id, email: mockUser.email } as any;
      expect(controller.getProfile(user)).toEqual(user);
    });
  });

  describe('googleAuth', () => {
    it('should initiate google auth', async () => {
      const req = {} as any;
      // The actual redirect is handled by Passport, so we just check if the method is called
      await controller.googleAuth(req);
      // No direct assertion needed here as it initiates a redirect
    });
  });

  describe('googleAuthRedirect', () => {
    it('should handle google auth redirect', async () => {
      const req = { user: mockUser } as any;
      expect(await controller.googleAuthRedirect(req)).toEqual({
        accessToken: 'googleaccess',
        refreshToken: 'googlerefresh',
      });
      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset OTP', async () => {
      const dto = { email: 'test@example.com' };
      expect(await controller.requestPasswordReset(dto)).toEqual({
        message: 'OTP sent successfully',
      });
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        dto.email,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const dto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newpass',
      };
      expect(await controller.resetPassword(dto)).toEqual({
        message: 'Password reset successfully.',
      });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        dto.email,
        dto.otp,
        dto.newPassword,
      );
    });
  });

  describe('logout', () => {
    it('should return a success message on logout', async () => {
      expect(await controller.logout()).toEqual({
        message: 'Logged out successfully',
      });
    });
  });
});
