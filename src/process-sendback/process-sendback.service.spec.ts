import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { APCompletedForm, FormResponse } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ProcessSendbackService } from './process-sendback.service';

const mockPrismaService = {
  aPCompletedForm: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  formResponse: {
    delete: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockAPCompletedForm: APCompletedForm = {
  id: 'completed-form-id-1',
  applicantProcessId: 'applicant-process-id-1',
  formId: 'form-id-1',
  reviewerId: 'user-id-1',
  createdAt: new Date(),
};

const mockFormResponse: FormResponse = {
  id: 'form-response-id-1',
  formId: 'form-id-1',
  applicantProcessId: 'applicant-process-id-1',
  responses: {},
  createdAt: new Date(),
};

describe('ProcessSendbackService', () => {
  let service: ProcessSendbackService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessSendbackService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ProcessSendbackService>(ProcessSendbackService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendback', () => {
    it('should delete the most recent completed form and its response', async () => {
      mockPrismaService.aPCompletedForm.findFirst.mockResolvedValue(
        mockAPCompletedForm,
      );
      mockPrismaService.formResponse.delete.mockResolvedValue(mockFormResponse);
      mockPrismaService.aPCompletedForm.delete.mockResolvedValue(
        mockAPCompletedForm,
      );

      await service.sendback(mockAPCompletedForm.applicantProcessId);

      expect(prisma.aPCompletedForm.findFirst).toHaveBeenCalledWith({
        where: { applicantProcessId: mockAPCompletedForm.applicantProcessId },
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.formResponse.delete).toHaveBeenCalledWith({
        where: {
          formId_applicantProcessId: {
            formId: mockAPCompletedForm.formId,
            applicantProcessId: mockAPCompletedForm.applicantProcessId,
          },
        },
      });
      expect(prisma.aPCompletedForm.delete).toHaveBeenCalledWith({
        where: { id: mockAPCompletedForm.id },
      });
    });

    it('should throw NotFoundException if no completed form is found', async () => {
      mockPrismaService.aPCompletedForm.findFirst.mockResolvedValue(null);

      await expect(
        service.sendback(mockAPCompletedForm.applicantProcessId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
