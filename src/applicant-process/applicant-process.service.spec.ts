import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess, ProcessStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ApplicantProcessService } from './applicant-process.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  applicantProcess: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
      findUnique: jest.fn(),
  },
  formResponse: {
    create: jest.fn(),
  },
  processForm: {
    findFirst: jest.fn(),
  },
  aPCompletedForm: {
      create: jest.fn(),
  }
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockEmailService = {
    sendEmail: jest.fn(),
}

const mockNotificationService = {
    sendNotification: jest.fn(),
}

const mockApplicantProcess: ApplicantProcess = {
  id: 'applicant-process-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: ProcessStatus.ENABLED,
  createdAt: new Date(),
};

describe('ApplicantProcessService', () => {
  let service: ApplicantProcessService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicantProcessService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ApplicantProcessService>(ApplicantProcessService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new applicant process and send notification', async () => {
      const createDto = { applicantId: 'user-id-1', processId: 'process-id-1', formId: 'form-1', responses: { q1: 'a1' } };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id-1' });
      mockPrismaService.applicantProcess.create.mockResolvedValue(mockApplicantProcess);
      mockPrismaService.processForm.findFirst.mockResolvedValue({ id: 'pf-1' });

      const result = await service.create(createDto);
      expect(result).toEqual(mockApplicantProcess);
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });
  });

  // ... other tests
});
