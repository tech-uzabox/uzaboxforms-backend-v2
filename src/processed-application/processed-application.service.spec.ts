import { Test, TestingModule } from '@nestjs/testing';
import { ProcessedApplicationService } from './processed-application.service';
import { PrismaService } from '../db/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  applicantProcess: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  formResponse: {
    upsert: jest.fn(),
  },
  aPCompletedForm: {
    create: jest.fn(),
  },
  processForm: {
    findFirst: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn(),
};

const mockNotificationService = {
    sendNotification: jest.fn(),
}

describe('ProcessedApplicationService', () => {
  let service: ProcessedApplicationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessedApplicationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ProcessedApplicationService>(ProcessedApplicationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      applicantProcessId: 'ap-1',
      formId: 'form-1',
      reviewerId: 'reviewer-1',
      responses: { q1: 'a1' },
    };

    it('should process an application step and send notification', async () => {
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue({ id: 'ap-1', processId: 'p-1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'reviewer-1' });
      mockPrismaService.processForm.findFirst.mockResolvedValue({ id: 'pf-1' });

      const result = await service.create(createDto);

      expect(prisma.formResponse.upsert).toHaveBeenCalled();
      expect(prisma.aPCompletedForm.create).toHaveBeenCalled();
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Application step processed successfully.' });
    });

    it('should throw NotFoundException if applicant process is not found', async () => {
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });
});
