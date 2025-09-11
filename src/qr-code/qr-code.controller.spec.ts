import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { QrCodeDocument } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { QrCodeController } from './qr-code.controller';
import { QrCodeService } from './qr-code.service';

const mockQrCodeDocument: QrCodeDocument = {
  id: 'qr-doc-id-1',
  documentName: 'Test Document',
  fileName: 'test.pdf',
  qrCodeId: 'qr-code-123',
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockQrCodeService = {
  create: jest.fn().mockResolvedValue(mockQrCodeDocument),
  findAll: jest.fn().mockResolvedValue([mockQrCodeDocument]),
  findOne: jest.fn().mockResolvedValue(mockQrCodeDocument),
  findByQrCodeId: jest.fn().mockResolvedValue(mockQrCodeDocument),
  update: jest.fn().mockResolvedValue(mockQrCodeDocument),
  remove: jest.fn().mockResolvedValue(mockQrCodeDocument),
  findByCreatorId: jest.fn().mockResolvedValue([mockQrCodeDocument]),
};

describe('QrCodeController', () => {
  let controller: QrCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrCodeController],
      providers: [
        { provide: QrCodeService, useValue: mockQrCodeService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<QrCodeController>(QrCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a QR code document', async () => {
      expect(await controller.create(mockQrCodeDocument)).toEqual(
        mockQrCodeDocument,
      );
      expect(mockQrCodeService.create).toHaveBeenCalledWith(mockQrCodeDocument);
    });
  });

  describe('findAll', () => {
    it('should return an array of QR code documents', async () => {
      expect(await controller.findAll()).toEqual([mockQrCodeDocument]);
      expect(mockQrCodeService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single QR code document', async () => {
      expect(await controller.findOne(mockQrCodeDocument.id)).toEqual(
        mockQrCodeDocument,
      );
      expect(mockQrCodeService.findOne).toHaveBeenCalledWith(
        mockQrCodeDocument.id,
      );
    });
  });

  describe('findByQrCodeId', () => {
    it('should return a single QR code document by qrCodeId', async () => {
      expect(
        await controller.findByQrCodeId(mockQrCodeDocument.qrCodeId),
      ).toEqual(mockQrCodeDocument);
      expect(mockQrCodeService.findByQrCodeId).toHaveBeenCalledWith(
        mockQrCodeDocument.qrCodeId,
      );
    });
  });

  describe('update', () => {
    it('should update a QR code document', async () => {
      const updateDto = { documentName: 'Updated Document' };
      expect(await controller.update(mockQrCodeDocument.id, updateDto)).toEqual(
        mockQrCodeDocument,
      );
      expect(mockQrCodeService.update).toHaveBeenCalledWith(
        mockQrCodeDocument.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a QR code document', async () => {
      expect(await controller.remove(mockQrCodeDocument.id)).toEqual(
        mockQrCodeDocument,
      );
      expect(mockQrCodeService.remove).toHaveBeenCalledWith(
        mockQrCodeDocument.id,
      );
    });
  });

  describe('findByCreatorId', () => {
    it('should return QR code documents by creator ID', async () => {
      expect(await controller.findByCreatorId('user-id-1')).toEqual([
        mockQrCodeDocument,
      ]);
      expect(mockQrCodeService.findByCreatorId).toHaveBeenCalledWith(
        'user-id-1',
      );
    });
  });
});
