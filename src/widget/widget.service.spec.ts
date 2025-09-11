import { Test, TestingModule } from '@nestjs/testing';
import { Widget } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { WidgetService } from './widget.service';

const mockPrismaService = {
  widget: {
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

const mockWidget: Widget = {
  id: 'widget-id-1',
  dashboardId: 'dashboard-id-1',
  title: 'Test Widget',
  visualizationType: 'card',
  config: {},
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WidgetService', () => {
  let service: WidgetService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WidgetService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<WidgetService>(WidgetService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new widget', async () => {
      const createDto = {
        dashboardId: 'dashboard-id-1',
        title: 'New Widget',
        visualizationType: 'card',
        config: {},
        order: 1,
      };
      mockPrismaService.widget.create.mockResolvedValue(mockWidget);

      const result = await service.create(createDto);
      expect(result).toEqual(mockWidget);
      expect(prisma.widget.create).toHaveBeenCalledWith({ data: createDto });
    });
  });

  describe('findAll', () => {
    it('should return an array of widgets', async () => {
      mockPrismaService.widget.findMany.mockResolvedValue([mockWidget]);

      const result = await service.findAll();
      expect(result).toEqual([mockWidget]);
      expect(prisma.widget.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single widget by id', async () => {
      mockPrismaService.widget.findUnique.mockResolvedValue(mockWidget);

      const result = await service.findOne(mockWidget.id);
      expect(result).toEqual(mockWidget);
      expect(prisma.widget.findUnique).toHaveBeenCalledWith({
        where: { id: mockWidget.id },
      });
    });
  });

  describe('update', () => {
    it('should update a widget', async () => {
      const updateDto = { title: 'Updated Widget' };
      const updatedWidget = { ...mockWidget, ...updateDto };
      mockPrismaService.widget.update.mockResolvedValue(updatedWidget);

      const result = await service.update(mockWidget.id, updateDto);
      expect(result).toEqual(updatedWidget);
      expect(prisma.widget.update).toHaveBeenCalledWith({
        where: { id: mockWidget.id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a widget', async () => {
      mockPrismaService.widget.delete.mockResolvedValue(mockWidget);

      await service.remove(mockWidget.id);
      expect(prisma.widget.delete).toHaveBeenCalledWith({
        where: { id: mockWidget.id },
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a widget', async () => {
      const duplicatedWidget = { ...mockWidget, id: 'new-widget-id' };
      mockPrismaService.widget.findUnique.mockResolvedValue(mockWidget);
      mockPrismaService.widget.create.mockResolvedValue(duplicatedWidget);

      const result = await service.duplicate(mockWidget.id, 'new-dashboard-id');
      expect(result).toEqual(duplicatedWidget);
      expect(prisma.widget.findUnique).toHaveBeenCalledWith({
        where: { id: mockWidget.id },
      });
      // Expect only the explicitly duplicated fields
      expect(prisma.widget.create).toHaveBeenCalledWith({
        data: {
          title: mockWidget.title,
          visualizationType: mockWidget.visualizationType,
          config: mockWidget.config,
          order: mockWidget.order,
          dashboardId: 'new-dashboard-id',
        },
      });
    });
  });
});
