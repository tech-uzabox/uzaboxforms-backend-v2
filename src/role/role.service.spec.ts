import { Test, TestingModule } from '@nestjs/testing';
import { Role, RoleStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { RoleService } from './role.service';

const mockPrismaService = {
  role: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockRole: Role = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Admin',
  description: 'Administrator Role',
  status: RoleStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('RoleService', () => {
  let service: RoleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createRoleDto = { name: 'Admin', description: 'Administrator' };
      mockPrismaService.role.create.mockResolvedValue(mockRole);

      const result = await service.create(createRoleDto);
      expect(result).toEqual(mockRole);
      expect(prisma.role.create).toHaveBeenCalledWith({ data: createRoleDto });
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'ROLE_CREATED',
        resource: 'Role',
        resourceId: mockRole.id,
        status: 'SUCCESS',
        details: { name: mockRole.name },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      mockPrismaService.role.findMany.mockResolvedValue([mockRole]);

      const result = await service.findAll();
      expect(result).toEqual([mockRole]);
      expect(prisma.role.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single role by id', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOne(mockRole.id);
      expect(result).toEqual(mockRole);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: mockRole.id },
      });
    });
  });

  describe('findOneByName', () => {
    it('should return a single role by name', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOneByName(mockRole.name);
      expect(result).toEqual(mockRole);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: mockRole.name },
      });
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const updateRoleDto = { name: 'Super Admin' };
      const updatedRole = { ...mockRole, ...updateRoleDto };
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(mockRole.id, updateRoleDto);
      expect(result).toEqual(updatedRole);
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: mockRole.id },
        data: updateRoleDto,
      });
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'ROLE_UPDATED',
        resource: 'Role',
        resourceId: updatedRole.id,
        status: 'SUCCESS',
        details: { name: updatedRole.name, changes: updateRoleDto },
      });
    });
  });

  describe('remove', () => {
    it('should delete a role', async () => {
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      const result = await service.remove(mockRole.id);
      expect(result).toEqual(mockRole);
      expect(prisma.role.delete).toHaveBeenCalledWith({
        where: { id: mockRole.id },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'ROLE_DELETED',
        resource: 'Role',
        resourceId: mockRole.id,
        status: 'SUCCESS',
        details: { name: mockRole.name },
      });
    });
  });
});
