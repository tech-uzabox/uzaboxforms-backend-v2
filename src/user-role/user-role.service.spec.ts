import { Test, TestingModule } from '@nestjs/testing';
import { RoleStatus, UserRole } from 'db';
import { PrismaService } from '../db/prisma.service';
import { UserRoleService } from './user-role.service';

const mockPrismaService = {
  userRole: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUserRole: UserRole = {
  userId: 'user-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

describe('UserRoleService', () => {
  let service: UserRoleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRoleService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserRoleService>(UserRoleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user role', async () => {
      mockPrismaService.userRole.create.mockResolvedValue(mockUserRole);

      const result = await service.create(
        mockUserRole.userId,
        mockUserRole.roleId,
      );
      expect(result).toEqual(mockUserRole);
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: mockUserRole.userId, roleId: mockUserRole.roleId },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of user roles', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([mockUserRole]);

      const result = await service.findAll();
      expect(result).toEqual([mockUserRole]);
      expect(prisma.userRole.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user role by userId and roleId', async () => {
      mockPrismaService.userRole.findUnique.mockResolvedValue(mockUserRole);

      const result = await service.findOne(
        mockUserRole.userId,
        mockUserRole.roleId,
      );
      expect(result).toEqual(mockUserRole);
      expect(prisma.userRole.findUnique).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: mockUserRole.userId,
            roleId: mockUserRole.roleId,
          },
        },
      });
    });
  });

  describe('findByUserId', () => {
    it('should return an array of user roles for a given userId', async () => {
      mockPrismaService.userRole.findMany.mockResolvedValue([mockUserRole]);

      const result = await service.findByUserId(mockUserRole.userId);
      expect(result).toEqual([mockUserRole]);
      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserRole.userId },
      });
    });
  });

  describe('update', () => {
    it('should update a user role', async () => {
      const updatedUserRole = { ...mockUserRole, status: RoleStatus.DISABLED };
      mockPrismaService.userRole.update.mockResolvedValue(updatedUserRole);

      const result = await service.update(
        mockUserRole.userId,
        mockUserRole.roleId,
        { status: RoleStatus.DISABLED },
      );
      expect(result).toEqual(updatedUserRole);
      expect(prisma.userRole.update).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: mockUserRole.userId,
            roleId: mockUserRole.roleId,
          },
        },
        data: { status: RoleStatus.DISABLED },
      });
    });
  });

  describe('remove', () => {
    it('should delete a user role', async () => {
      mockPrismaService.userRole.delete.mockResolvedValue(mockUserRole);

      await service.remove(mockUserRole.userId, mockUserRole.roleId);
      expect(prisma.userRole.delete).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: mockUserRole.userId,
            roleId: mockUserRole.roleId,
          },
        },
      });
    });
  });
});
