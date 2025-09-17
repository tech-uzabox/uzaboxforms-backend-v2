import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QrCodeDocument } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { QrCodeService } from './qr-code.service';

const mockPrismaService = {
  qrCodeDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockQrCodeDocument: any = {
  id: 'qr-doc-id-1',
  documentName: 'Test Document',
  fileName: 'test.pdf',
  qrCodeId: 'qr-code-123',
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: {
    firstName: 'John',
    lastName: 'Doe',
  },
};

describe('QrCodeService', () => {
  let service: QrCodeService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrCodeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<QrCodeService>(QrCodeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new QR code document', async () => {
      const createData = {
        documentName: 'Test Document',
        fileName: 'test.pdf',
        qrCodeId: 'qr-code-123',
        creatorId: 'user-id-1',
      };
      mockPrismaService.qrCodeDocument.create.mockResolvedValue(
        mockQrCodeDocument,
      );

      const result = await service.create(createData);
      expect(result).toEqual(mockQrCodeDocument);
      expect(prisma.qrCodeDocument.create).toHaveBeenCalledWith({
        data: {
          documentName: 'Test Document',
          fileName: 'test.pdf',
          qrCodeId: 'qr-code-123',
          creator: {
            connect: { id: 'user-id-1' },
          },
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of QR code documents', async () => {
      mockPrismaService.qrCodeDocument.findMany.mockResolvedValue([
        mockQrCodeDocument,
      ]);

      const result = await service.findAll();
      expect(result).toEqual([mockQrCodeDocument]);
      expect(prisma.qrCodeDocument.findMany).toHaveBeenCalledWith({
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single QR code document by id', async () => {
      mockPrismaService.qrCodeDocument.findUnique.mockResolvedValue(
        mockQrCodeDocument,
      );

      const result = await service.findOne(mockQrCodeDocument.id);
      expect(result).toEqual(mockQrCodeDocument);
      expect(prisma.qrCodeDocument.findUnique).toHaveBeenCalledWith({
        where: { id: mockQrCodeDocument.id },
      });
    });
  });

  describe('findByQrCodeId', () => {
    it('should return a single QR code document by qrCodeId', async () => {
      mockPrismaService.qrCodeDocument.findFirst.mockResolvedValue(
        mockQrCodeDocument,
      );

      const result = await service.findByQrCodeId(mockQrCodeDocument.qrCodeId);
      expect(result).toEqual(mockQrCodeDocument);
      expect(prisma.qrCodeDocument.findFirst).toHaveBeenCalledWith({
        where: { qrCodeId: mockQrCodeDocument.qrCodeId },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if QR code document not found by qrCodeId', async () => {
      mockPrismaService.qrCodeDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.findByQrCodeId('nonexistent-qr-code'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a QR code document', async () => {
      const updateDto = { documentName: 'Updated Document' };
      const updatedDoc = { ...mockQrCodeDocument, ...updateDto };
      mockPrismaService.qrCodeDocument.update.mockResolvedValue(updatedDoc);

      const result = await service.update(mockQrCodeDocument.id, updateDto);
      expect(result).toEqual(updatedDoc);
      expect(prisma.qrCodeDocument.update).toHaveBeenCalledWith({
        where: { id: mockQrCodeDocument.id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a QR code document', async () => {
      mockPrismaService.qrCodeDocument.delete.mockResolvedValue(
        mockQrCodeDocument,
      );

      await service.remove(mockQrCodeDocument.id);
      expect(prisma.qrCodeDocument.delete).toHaveBeenCalledWith({
        where: { id: mockQrCodeDocument.id },
      });
    });
  });

  describe('findByCreatorId', () => {
    it('should return QR code documents by creator ID', async () => {
      mockPrismaService.qrCodeDocument.findMany.mockResolvedValue([
        mockQrCodeDocument,
      ]);

      const result = await service.findByCreatorId('user-id-1');
      expect(result).toEqual([mockQrCodeDocument]);
      expect(prisma.qrCodeDocument.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'user-id-1' },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
