import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { UserService } from './user.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userRole: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  role: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuditLogService = {
  log: jest.fn(),
};

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

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with a hashed password', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { ...createUserDto, password: 'hashedpassword', roles: undefined },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'USER_CREATED',
        resource: 'User',
        resourceId: mockUser.id,
        status: 'SUCCESS',
        details: { email: mockUser.email },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a single user by email', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);
      expect(result).toEqual(mockUser);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });
  });

  describe('update', () => {
      it('should update a user and hash password if provided', async () => {
        const updateUserDto = { firstName: 'Updated', password: 'newpassword' };
        const updatedUser = {
          ...mockUser,
          firstName: 'Updated',
          password: 'hashednewpassword',
        };
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashednewpassword');
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.user.update.mockResolvedValue(updatedUser);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return callback({
            ...mockPrismaService,
            update: jest.fn().mockResolvedValue(updatedUser),
          });
        });

        const result = await service.update(mockUser.id, updateUserDto);
        expect(result).toEqual(updatedUser);
      });

      it('should update a user without hashing password if not provided', async () => {
        const updateUserDto = { firstName: 'Updated' };
        const updatedUser = { ...mockUser, ...updateUserDto };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        mockPrismaService.user.update.mockResolvedValue(updatedUser);
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return callback({
            ...mockPrismaService,
            update: jest.fn().mockResolvedValue(updatedUser),
          });
        });

        const result = await service.update(mockUser.id, updateUserDto);
        expect(result).toEqual(updatedUser);
      });

      it('should throw NotFoundException if user not found', async () => {
        const updateUserDto = { firstName: 'Updated' };
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.update('nonexistent', updateUserDto)).rejects.toThrow('User not found.');
      });
    });

  describe('changePassword', () => {
    it(`should change the user's password`, async () => {
      const newHashedPassword = 'newhashedpassword';
      const updatedUser = { ...mockUser, password: newHashedPassword };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.changePassword(
        mockUser.id,
        'oldpassword',
        'newpassword',
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldpassword',
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: newHashedPassword },
      });
      expect(result.password).toEqual(newHashedPassword);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: updatedUser.id,
        action: 'PASSWORD_CHANGED',
        resource: 'User',
        resourceId: updatedUser.id,
        status: 'SUCCESS',
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(mockUser.id, 'oldpassword', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if old password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, 'wrongpassword', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove(mockUser.id);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: 'USER_DELETED',
        resource: 'User',
        resourceId: mockUser.id,
        status: 'SUCCESS',
        details: { email: mockUser.email },
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.delete.mockRejectedValue(new Error('User not found'));

      await expect(service.remove('nonexistent')).rejects.toThrow('User not found');
    });
  });
});
