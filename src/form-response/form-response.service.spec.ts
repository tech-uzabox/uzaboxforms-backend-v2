import { Test, TestingModule } from '@nestjs/testing';
import { FormResponse } from 'db';
import { PrismaService } from '../db/prisma.service';
import { FormResponseService } from './form-response.service';

const mockPrismaService = {
  formResponse: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    findFirst: jest.fn(), // Added findFirst
  },
  applicantProcess: {
    findUnique: jest.fn(),
  },
  form: {
    findUnique: jest.fn(),
  },
};

const mockFormResponse: FormResponse = {
  id: 'response-id-1',
  formId: 'form-id-1',
  applicantProcessId: 'applicant-process-id-1',
  responses: { question1: 'answer1' },
  createdAt: new Date(),
};

describe('FormResponseService', () => {
  let service: FormResponseService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormResponseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FormResponseService>(FormResponseService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new form response', async () => {
      const mockApplicantProcess = { id: 'applicant-process-id-1', processId: 'process-id-1' };
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue(mockApplicantProcess);

      mockPrismaService.formResponse.create.mockResolvedValue(mockFormResponse);

      const result = await service.create(mockFormResponse);
      expect(result).toEqual(mockFormResponse);
      expect(prisma.formResponse.create).toHaveBeenCalledWith({
        data: {
          form: { connect: { id: mockFormResponse.formId } },
          process: { connect: { id: mockApplicantProcess.processId } },
          applicantProcess: { connect: { id: mockFormResponse.applicantProcessId } },
          responses: mockFormResponse.responses,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of form responses', async () => {
      mockPrismaService.formResponse.findMany.mockResolvedValue([
        mockFormResponse,
      ]);

      const result = await service.findAll();
      expect(result).toEqual([mockFormResponse]);
      expect(prisma.formResponse.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single form response by id', async () => {
      mockPrismaService.formResponse.findUnique.mockResolvedValue(
        mockFormResponse,
      );

      const result = await service.findOne(mockFormResponse.id);
      expect(result).toEqual(mockFormResponse);
      expect(prisma.formResponse.findUnique).toHaveBeenCalledWith({
        where: { id: mockFormResponse.id },
      });
    });
  });

  describe('update', () => {
    it('should update a form response', async () => {
      const updatedResponse = {
        ...mockFormResponse,
        responses: { question1: 'updated' },
      };
      mockPrismaService.formResponse.update.mockResolvedValue(updatedResponse);

      const result = await service.update(mockFormResponse.id, {
        responses: { question1: 'updated' },
      });
      expect(result).toEqual(updatedResponse);
      expect(prisma.formResponse.update).toHaveBeenCalledWith({
        where: { id: mockFormResponse.id },
        data: { responses: { question1: 'updated' } },
      });
    });
  });

  describe('remove', () => {
    it('should delete a form response', async () => {
      mockPrismaService.formResponse.delete.mockResolvedValue(mockFormResponse);

      await service.remove(mockFormResponse.id);
      expect(prisma.formResponse.delete).toHaveBeenCalledWith({
        where: { id: mockFormResponse.id },
      });
    });
  });

  describe('submitResponse', () => {
    it('should upsert a form response', async () => {
      const mockApplicantProcess = { id: 'applicant-process-id-1', processId: 'process-id-1' };
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue(mockApplicantProcess);

      mockPrismaService.formResponse.upsert.mockResolvedValue(mockFormResponse);

      const result = await service.submitResponse(
        mockFormResponse.formId,
        mockFormResponse.applicantProcessId,
        mockFormResponse.responses,
      );
      expect(result).toEqual(mockFormResponse);
      expect(prisma.formResponse.upsert).toHaveBeenCalledWith({
        where: {
          formId_applicantProcessId: {
            formId: mockFormResponse.formId,
            applicantProcessId: mockFormResponse.applicantProcessId,
          },
        },
        update: { responses: mockFormResponse.responses },
        create: {
          form: { connect: { id: mockFormResponse.formId } },
          process: { connect: { id: mockApplicantProcess.processId } },
          applicantProcess: { connect: { id: mockFormResponse.applicantProcessId } },
          responses: mockFormResponse.responses,
        },
      });
    });
  });

  describe('submitPublicResponse', () => {
    it('should create a public form response', async () => {
      const mockFormWithProcessForms = {
        id: 'form-id-1',
        processForms: [{ processId: 'process-id-1' }],
      };
      mockPrismaService.form.findUnique.mockResolvedValue(mockFormWithProcessForms);

      mockPrismaService.formResponse.create.mockResolvedValue(mockFormResponse);

      const result = await service.submitPublicResponse(
        mockFormResponse.formId,
        mockFormResponse.responses,
      );
      expect(result).toEqual(mockFormResponse);
      expect(prisma.formResponse.create).toHaveBeenCalledWith({
        data: {
          form: { connect: { id: mockFormResponse.formId } },
          process: { connect: { id: mockFormWithProcessForms.processForms[0].processId } },
          applicantProcess: {
            create: {
              applicant: { create: { email: 'public@user.com', password: '' } },
              process: { connect: { id: mockFormWithProcessForms.processForms[0].processId } },
            },
          },
          responses: mockFormResponse.responses,
        },
      });
    });
  });

  describe('findByUserId', () => {
    it('should return form responses for a given user ID', async () => {
      mockPrismaService.formResponse.findMany.mockResolvedValue([
        mockFormResponse,
      ]);

      const result = await service.findByUserId('some-user-id');
      expect(result).toEqual([mockFormResponse]);
      expect(prisma.formResponse.findMany).toHaveBeenCalledWith({
        where: { applicantProcess: { applicantId: 'some-user-id' } },
      });
    });
  });

  describe('findByUserIdAndFormId', () => {
    it('should return a form response for a given user ID and form ID', async () => {
      mockPrismaService.formResponse.findFirst.mockResolvedValue(
        mockFormResponse,
      );

      const result = await service.findByUserIdAndFormId(
        'some-user-id',
        'some-form-id',
      );
      expect(result).toEqual(mockFormResponse);
      expect(prisma.formResponse.findFirst).toHaveBeenCalledWith({
        where: {
          formId: 'some-form-id',
          applicantProcess: { applicantId: 'some-user-id' },
        },
      });
    });
  });
});
