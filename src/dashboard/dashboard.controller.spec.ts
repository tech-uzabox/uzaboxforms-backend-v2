import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Dashboard } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

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

const mockDashboardService = {
  create: jest.fn().mockResolvedValue(mockDashboard),
  findAll: jest.fn().mockResolvedValue([mockDashboard]),
  findAllForUser: jest.fn().mockResolvedValue([mockDashboard]),
  findOne: jest.fn().mockResolvedValue(mockDashboard),
  update: jest.fn().mockResolvedValue(mockDashboard),
  remove: jest.fn().mockResolvedValue(mockDashboard),
};

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a dashboard', async () => {
      const createDto = { name: 'New Dashboard', ownerId: 'user-id-1' };
      expect(await controller.create(createDto)).toEqual(mockDashboard);
      expect(mockDashboardService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of dashboards', async () => {
      const req = { user: { id: 'user-id-1', roles: ['role-1'] } };
      expect(await controller.findAll(req)).toEqual([mockDashboard]);
      expect(mockDashboardService.findAllForUser).toHaveBeenCalledWith(
        'user-id-1',
        ['role-1'],
      );
    });
  });

  describe('findOne', () => {
    it('should return a single dashboard', async () => {
      expect(await controller.findOne(mockDashboard.id)).toEqual(mockDashboard);
      expect(mockDashboardService.findOne).toHaveBeenCalledWith(
        mockDashboard.id,
      );
    });
  });

  describe('update', () => {
    it('should update a dashboard', async () => {
      const updateDto = { name: 'Updated Dashboard' };
      expect(await controller.update(mockDashboard.id, updateDto)).toEqual(
        mockDashboard,
      );
      expect(mockDashboardService.update).toHaveBeenCalledWith(
        mockDashboard.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a dashboard', async () => {
      expect(await controller.remove(mockDashboard.id)).toEqual(mockDashboard);
      expect(mockDashboardService.remove).toHaveBeenCalledWith(
        mockDashboard.id,
      );
    });
  });
});
