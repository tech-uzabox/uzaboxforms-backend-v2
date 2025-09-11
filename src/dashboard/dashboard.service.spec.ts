import { Test, TestingModule } from '@nestjs/testing';
import { Dashboard } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { DashboardService } from './dashboard.service';

const mockPrismaService = {
  dashboard: {
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

const mockDashboard: Dashboard = {
  id: 'dashboard-id-1',
  name: 'Test Dashboard',
  ownerId: 'user-id-1',
  allowedUsers: [],
  allowedRoles: [],
  layout: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new dashboard', async () => {
      const createDto = { name: 'New Dashboard', ownerId: 'user-id-1' };
      mockPrismaService.dashboard.create.mockResolvedValue(mockDashboard);

      const result = await service.create(createDto);
      expect(result).toEqual(mockDashboard);
      expect(prisma.dashboard.create).toHaveBeenCalledWith({ data: createDto });
    });
  });

  describe('findAll', () => {
    it('should return an array of dashboards', async () => {
      mockPrismaService.dashboard.findMany.mockResolvedValue([mockDashboard]);

      const result = await service.findAll();
      expect(result).toEqual([mockDashboard]);
      expect(prisma.dashboard.findMany).toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should return dashboards accessible to a user', async () => {
      mockPrismaService.dashboard.findMany.mockResolvedValue([mockDashboard]);

      const result = await service.findAllForUser('user-id-1', ['role-1']);
      expect(result).toEqual([mockDashboard]);
      expect(prisma.dashboard.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: 'user-id-1' },
            { allowedUsers: { has: 'user-id-1' } },
            { allowedRoles: { hasSome: ['role-1'] } },
          ],
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single dashboard by id', async () => {
      mockPrismaService.dashboard.findUnique.mockResolvedValue(mockDashboard);

      const result = await service.findOne(mockDashboard.id);
      expect(result).toEqual(mockDashboard);
      expect(prisma.dashboard.findUnique).toHaveBeenCalledWith({
        where: { id: mockDashboard.id },
      });
    });
  });

  describe('update', () => {
    it('should update a dashboard', async () => {
      const updateDto = { name: 'Updated Dashboard' };
      const updatedDashboard = { ...mockDashboard, ...updateDto };
      mockPrismaService.dashboard.update.mockResolvedValue(updatedDashboard);

      const result = await service.update(mockDashboard.id, updateDto);
      expect(result).toEqual(updatedDashboard);
      expect(prisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: mockDashboard.id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a dashboard', async () => {
      mockPrismaService.dashboard.delete.mockResolvedValue(mockDashboard);

      await service.remove(mockDashboard.id);
      expect(prisma.dashboard.delete).toHaveBeenCalledWith({
        where: { id: mockDashboard.id },
      });
    });
  });
});
