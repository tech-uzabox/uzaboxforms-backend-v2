import { Test, TestingModule } from '@nestjs/testing';
import { GroupRole, RoleStatus } from 'db';
import { PrismaService } from '../db/prisma.service';
import { GroupRoleService } from './group-role.service';

const mockPrismaService = {
  groupRole: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockGroupRole: GroupRole = {
  groupId: 'group-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

describe('GroupRoleService', () => {
  let service: GroupRoleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupRoleService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupRoleService>(GroupRoleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new group role', async () => {
      mockPrismaService.groupRole.create.mockResolvedValue(mockGroupRole);

      const result = await service.create(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
      );
      expect(result).toEqual(mockGroupRole);
      expect(prisma.groupRole.create).toHaveBeenCalledWith({
        data: { groupId: mockGroupRole.groupId, roleId: mockGroupRole.roleId },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of group roles', async () => {
      mockPrismaService.groupRole.findMany.mockResolvedValue([mockGroupRole]);

      const result = await service.findAll();
      expect(result).toEqual([mockGroupRole]);
      expect(prisma.groupRole.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single group role by groupId and roleId', async () => {
      mockPrismaService.groupRole.findUnique.mockResolvedValue(mockGroupRole);

      const result = await service.findOne(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
      );
      expect(result).toEqual(mockGroupRole);
      expect(prisma.groupRole.findUnique).toHaveBeenCalledWith({
        where: {
          groupId_roleId: {
            groupId: mockGroupRole.groupId,
            roleId: mockGroupRole.roleId,
          },
        },
      });
    });
  });

  describe('findByGroupId', () => {
    it('should return an array of group roles for a given groupId', async () => {
      mockPrismaService.groupRole.findMany.mockResolvedValue([mockGroupRole]);

      const result = await service.findByGroupId(mockGroupRole.groupId);
      expect(result).toEqual([mockGroupRole]);
      expect(prisma.groupRole.findMany).toHaveBeenCalledWith({
        where: { groupId: mockGroupRole.groupId },
      });
    });
  });

  describe('update', () => {
    it('should update a group role', async () => {
      const updatedGroupRole = {
        ...mockGroupRole,
        status: RoleStatus.DISABLED,
      };
      mockPrismaService.groupRole.update.mockResolvedValue(updatedGroupRole);

      const result = await service.update(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
        { status: RoleStatus.DISABLED },
      );
      expect(result).toEqual(updatedGroupRole);
      expect(prisma.groupRole.update).toHaveBeenCalledWith({
        where: {
          groupId_roleId: {
            groupId: mockGroupRole.groupId,
            roleId: mockGroupRole.roleId,
          },
        },
        data: { status: RoleStatus.DISABLED },
      });
    });
  });

  describe('remove', () => {
    it('should delete a group role', async () => {
      mockPrismaService.groupRole.delete.mockResolvedValue(mockGroupRole);

      await service.remove(mockGroupRole.groupId, mockGroupRole.roleId);
      expect(prisma.groupRole.delete).toHaveBeenCalledWith({
        where: {
          groupId_roleId: {
            groupId: mockGroupRole.groupId,
            roleId: mockGroupRole.roleId,
          },
        },
      });
    });
  });
});
