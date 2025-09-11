import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRole, RoleStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ProcessRoleService } from './process-role.service';

const mockPrismaService = {
  processRole: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockProcessRole: ProcessRole = {
  processId: 'process-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

describe('ProcessRoleService', () => {
  let service: ProcessRoleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRoleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ProcessRoleService>(ProcessRoleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new process role', async () => {
      mockPrismaService.processRole.create.mockResolvedValue(mockProcessRole);

      const result = await service.create(
        mockProcessRole.processId,
        mockProcessRole.roleId,
      );
      expect(result).toEqual(mockProcessRole);
      expect(prisma.processRole.create).toHaveBeenCalledWith({
        data: {
          processId: mockProcessRole.processId,
          roleId: mockProcessRole.roleId,
        },
      });
    });
  });

  describe('createMany', () => {
    it('should create multiple process roles', async () => {
      const processRoles = [
        { processId: 'process-id-1', roleId: 'role-id-1' },
        { processId: 'process-id-1', roleId: 'role-id-2' },
      ];
      mockPrismaService.processRole.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createMany(processRoles);
      expect(result).toEqual({ count: 2 });
      expect(prisma.processRole.createMany).toHaveBeenCalledWith({
        data: processRoles,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of process roles', async () => {
      mockPrismaService.processRole.findMany.mockResolvedValue([
        mockProcessRole,
      ]);

      const result = await service.findAll();
      expect(result).toEqual([mockProcessRole]);
      expect(prisma.processRole.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process role by processId and roleId', async () => {
      mockPrismaService.processRole.findUnique.mockResolvedValue(
        mockProcessRole,
      );

      const result = await service.findOne(
        mockProcessRole.processId,
        mockProcessRole.roleId,
      );
      expect(result).toEqual(mockProcessRole);
      expect(prisma.processRole.findUnique).toHaveBeenCalledWith({
        where: {
          processId_roleId: {
            processId: mockProcessRole.processId,
            roleId: mockProcessRole.roleId,
          },
        },
      });
    });
  });

  describe('findByProcessId', () => {
    it('should return an array of process roles for a given processId', async () => {
      mockPrismaService.processRole.findMany.mockResolvedValue([
        mockProcessRole,
      ]);

      const result = await service.findByProcessId(mockProcessRole.processId);
      expect(result).toEqual([mockProcessRole]);
      expect(prisma.processRole.findMany).toHaveBeenCalledWith({
        where: { processId: mockProcessRole.processId },
      });
    });
  });

  describe('update', () => {
    it('should update a process role', async () => {
      const updatedProcessRole = {
        ...mockProcessRole,
        status: RoleStatus.DISABLED,
      };
      mockPrismaService.processRole.update.mockResolvedValue(
        updatedProcessRole,
      );

      const result = await service.update(
        mockProcessRole.processId,
        mockProcessRole.roleId,
        { status: RoleStatus.DISABLED },
      );
      expect(result).toEqual(updatedProcessRole);
      expect(prisma.processRole.update).toHaveBeenCalledWith({
        where: {
          processId_roleId: {
            processId: mockProcessRole.processId,
            roleId: mockProcessRole.roleId,
          },
        },
        data: { status: RoleStatus.DISABLED },
      });
    });
  });

  describe('remove', () => {
    it('should delete a process role', async () => {
      mockPrismaService.processRole.delete.mockResolvedValue(mockProcessRole);

      await service.remove(mockProcessRole.processId, mockProcessRole.roleId);
      expect(prisma.processRole.delete).toHaveBeenCalledWith({
        where: {
          processId_roleId: {
            processId: mockProcessRole.processId,
            roleId: mockProcessRole.roleId,
          },
        },
      });
    });
  });
});
