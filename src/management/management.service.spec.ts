import { Test, TestingModule } from '@nestjs/testing';
import { ManagementService } from './management.service';
import { PrismaService } from '../db/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrismaService = {
  management: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('ManagementService', () => {
  let service: ManagementService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagementService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ManagementService>(ManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should upload an image and log audit', async () => {
      const mockImage = { id: '1', fileName: 'test.jpg', type: 'HEADER' as const };
      mockPrismaService.management.create.mockResolvedValue(mockImage);

      const result = await service.uploadImage('test.jpg', 'HEADER', 'user-id');
      expect(result).toEqual(mockImage);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'MANAGEMENT_IMAGE_UPLOADED',
        resource: 'Management',
        resourceId: '1',
        status: 'SUCCESS',
        details: { fileName: 'test.jpg', type: 'HEADER' },
      });
    });
  });

  describe('deleteImage', () => {
    it('should delete an image and log audit', async () => {
      mockPrismaService.management.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteImage('test.jpg', 'HEADER', 'user-id');
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'MANAGEMENT_IMAGE_DELETED',
        resource: 'Management',
        status: 'SUCCESS',
        details: { fileName: 'test.jpg', type: 'HEADER' },
      });
    });

    it('should throw NotFoundException if image not found', async () => {
      mockPrismaService.management.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.deleteImage('test.jpg', 'HEADER')).rejects.toThrow('Image with fileName test.jpg and type HEADER not found');
    });
  });

  describe('getAllImages', () => {
    it('should return all images', async () => {
      const mockImages = [{ id: '1', fileName: 'test.jpg', type: 'HEADER' }];
      mockPrismaService.management.findMany.mockResolvedValue(mockImages);

      const result = await service.getAllImages();
      expect(result).toEqual(mockImages);
    });
  });
});
