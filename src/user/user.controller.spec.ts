import { UnauthorizedException } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';

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

const mockUserService = {
  create: jest.fn().mockResolvedValue(mockUser),
  findAll: jest.fn().mockResolvedValue([mockUser]),
  findOne: jest.fn().mockResolvedValue(mockUser),
  update: jest.fn().mockResolvedValue(mockUser),
  remove: jest.fn().mockResolvedValue(mockUser),
  changePassword: jest.fn().mockResolvedValue(mockUser),
};

// Mock JwtAuthGuard
class MockJwtAuthGuard {
  canActivate = jest.fn(() => true);
}

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };
      expect(await controller.create(createUserDto)).toEqual(mockUser);
      expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw error if creation fails', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };
      mockUserService.create.mockRejectedValue(new Error('Creation failed'));
      await expect(controller.create(createUserDto)).rejects.toThrow('Creation failed');
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      expect(await controller.findAll()).toEqual([mockUser]);
      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      expect(await controller.findOne(mockUser.id)).toEqual(mockUser);
      expect(mockUserService.findOne).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = { firstName: 'Updated' };
      expect(await controller.update(mockUser.id, updateUserDto)).toEqual(
        mockUser,
      );
      expect(mockUserService.update).toHaveBeenCalledWith(
        mockUser.id,
        updateUserDto,
      );
    });

    it('should throw error if update fails', async () => {
      const updateUserDto = { firstName: 'Updated' };
      mockUserService.update.mockRejectedValue(new Error('Update failed'));
      await expect(controller.update(mockUser.id, updateUserDto)).rejects.toThrow('Update failed');
    });
  });

  describe('changePassword', () => {
    it(`should change the user's password`, async () => {
      const changePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };
      const req = { user: { sub: mockUser.id } };
      expect(
        await controller.changePassword(mockUser.id, changePasswordDto, req),
      ).toEqual(mockUser);
      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto.oldPassword,
        changePasswordDto.newPassword,
      );
    });

    it('should throw UnauthorizedException if user is not authorized', async () => {
      const changePasswordDto = {
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      };
      const req = { user: { sub: 'another-user-id' } };
      // Use a try-catch block to assert the exception
      try {
        await controller.changePassword(mockUser.id, changePasswordDto, req);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      expect(await controller.remove(mockUser.id)).toEqual(mockUser);
      expect(mockUserService.remove).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw error if removal fails', async () => {
      mockUserService.remove.mockRejectedValue(new Error('Removal failed'));
      await expect(controller.remove(mockUser.id)).rejects.toThrow('Removal failed');
    });
  });
});
