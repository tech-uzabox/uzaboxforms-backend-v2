import { Test, TestingModule } from '@nestjs/testing';
import { Form, FormStatus, FormType } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { FormService } from './form.service';

const mockPrismaService = {
  form: {
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

const mockForm: Form = {
  id: 'form-id-1',
  name: 'Test Form',
  type: FormType.INTERNAL,
  status: FormStatus.ENABLED,
  archived: false,
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  design: {},
};

describe('FormService', () => {
  let service: FormService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<FormService>(FormService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new form', async () => {
      const createFormDto = {
        name: 'New Form',
        creatorId: 'user-id-1',
        type: mockForm.type,
        status: mockForm.status,
        design: mockForm.design,
      };
      mockPrismaService.form.create.mockResolvedValue(mockForm);

      const result = await service.create(createFormDto);
      expect(result).toEqual(mockForm);
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: createFormDto.name,
          creator: { connect: { id: createFormDto.creatorId } },
          type: mockForm.type,
          status: mockForm.status,
          design: mockForm.design,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of forms', async () => {
      mockPrismaService.form.findMany.mockResolvedValue([mockForm]);

      const result = await service.findAll();
      expect(result).toEqual([mockForm]);
      expect(prisma.form.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single form by id', async () => {
      mockPrismaService.form.findUnique.mockResolvedValue(mockForm);

      const result = await service.findOne(mockForm.id);
      expect(result).toEqual(mockForm);
      expect(prisma.form.findUnique).toHaveBeenCalledWith({
        where: { id: mockForm.id },
      });
    });
  });

  describe('update', () => {
    it('should update a form', async () => {
      const updateFormDto = { name: 'Updated Form' };
      const updatedForm = { ...mockForm, ...updateFormDto };
      mockPrismaService.form.update.mockResolvedValue(updatedForm);

      const result = await service.update(mockForm.id, updateFormDto);
      expect(result).toEqual(updatedForm);
      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: mockForm.id },
        data: updateFormDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a form', async () => {
      mockPrismaService.form.delete.mockResolvedValue(mockForm);

      await service.remove(mockForm.id);
      expect(prisma.form.delete).toHaveBeenCalledWith({
        where: { id: mockForm.id },
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a form', async () => {
      const newFormName = 'Test Form - Copy';
      const duplicatedForm = {
        ...mockForm,
        id: 'new-form-id',
        name: newFormName,
      };

      mockPrismaService.form.findUnique.mockResolvedValue(mockForm);
      mockPrismaService.form.create.mockResolvedValue(duplicatedForm);
      mockPrismaService.form.findFirst.mockResolvedValue(null); // For name uniqueness check

      const result = await service.duplicate(mockForm.id, 'user-id-1');
      expect(result).toEqual(duplicatedForm);
      expect(prisma.form.findUnique).toHaveBeenCalledWith({
        where: { id: mockForm.id },
      });
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: newFormName,
          type: mockForm.type,
          status: mockForm.status,
          archived: mockForm.archived,
          creatorId: 'user-id-1',
          design: mockForm.design,
        },
      });
    });

    it('should handle duplicate name by appending a number', async () => {
      const newFormName = 'Test Form - Copy';
      const newFormName2 = 'Test Form - Copy (2)';
      const duplicatedForm = {
        ...mockForm,
        id: 'new-form-id-2',
        name: newFormName2,
      };

      mockPrismaService.form.findUnique.mockResolvedValue(mockForm);
      mockPrismaService.form.findFirst
        .mockResolvedValueOnce({ id: 'existing-copy', name: newFormName })
        .mockResolvedValueOnce(null); // Second check for (2) is unique
      mockPrismaService.form.create.mockResolvedValue(duplicatedForm);

      const result = await service.duplicate(mockForm.id, 'user-id-1');
      expect(result).toEqual(duplicatedForm);
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: newFormName2,
          type: mockForm.type,
          status: mockForm.status,
          archived: mockForm.archived,
          creatorId: 'user-id-1',
          design: mockForm.design,
        },
      });
    });
  });
});
