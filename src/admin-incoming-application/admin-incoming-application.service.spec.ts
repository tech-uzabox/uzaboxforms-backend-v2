import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess, Process, User, Group, ProcessStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { AdminIncomingApplicationService } from './admin-incoming-application.service';

const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashed',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: 'ENABLED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGroup: Group = {
  id: 'group-id-1',
  name: 'Test Group',
  status: 'ENABLED',
  creatorId: 'creator-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProcess: Process & { group: Group, _count: { forms: number } } = {
  id: 'process-id-1',
  name: 'Test Process',
  type: 'PRIVATE',
  groupId: 'group-id-1',
  creatorId: 'creator-id-1',
  status: 'ENABLED',
  archived: false,
  staffViewForms: false,
  applicantViewProcessLevel: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  group: mockGroup,
  _count: { forms: 2 },
};

const mockApplicantProcessPending: ApplicantProcess & { applicant: User, _count: { completedForms: number } } = {
  id: 'app-proc-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: 'ENABLED',
  createdAt: new Date(),
  applicant: mockUser,
  _count: { completedForms: 1 },
};

const mockApplicantProcessCompleted: ApplicantProcess & { applicant: User, _count: { completedForms: number } } = {
  id: 'app-proc-id-2',
  applicantId: 'user-id-2',
  processId: 'process-id-1',
  status: 'ENABLED',
  createdAt: new Date(),
  applicant: mockUser,
  _count: { completedForms: 2 }, 
};

const mockApplicantProcessDisabled: ApplicantProcess & { applicant: User, process: Process & { group: Group } } = {
  id: 'app-proc-id-3',
  applicantId: 'user-id-3',
  processId: 'process-id-1',
  status: 'DISABLED',
  createdAt: new Date(),
  applicant: mockUser,
  process: { ...mockProcess, _count: { forms: 2 } },
};

const mockPrismaService = {
  applicantProcess: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  process: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('AdminIncomingApplicationService', () => {
  let service: AdminIncomingApplicationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminIncomingApplicationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AdminIncomingApplicationService>(
      AdminIncomingApplicationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPendingApplications', () => {
    it('should return pending applications', async () => {
      mockPrismaService.process.findMany.mockResolvedValue([mockProcess]);
      mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcessPending]);

      const result = await service.getAllPendingApplications();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Pending');
      expect(result[0].completedFormsCount).toBe(1);
      expect(result[0].totalFormsCount).toBe(2);
    });
  });

  describe('getAllCompletedApplications', () => {
    it('should return completed applications', async () => {
      mockPrismaService.process.findMany.mockResolvedValue([mockProcess]);
      mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcessCompleted]);

      const result = await service.getAllCompletedApplications();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Completed');
      expect(result[0].completedFormsCount).toBe(2);
      expect(result[0].totalFormsCount).toBe(2);
    });
  });

  describe('getAllDisabledApplications', () => {
    it('should return disabled applications', async () => {
      mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcessDisabled]);

      const result = await service.getAllDisabledApplications();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Disabled');
    });
  });

  describe('getSingleApplication', () => {
    it('should return a single application with total forms count', async () => {
      const applicantProcessWithDetails = {
        ...mockApplicantProcessCompleted,
        process: mockProcess,
      };
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue(applicantProcessWithDetails);

      const result = await service.getSingleApplication('process-id-1', 'app-proc-id-2');
      expect(result).toBeDefined();
      expect(result.process.totalFormsCount).toBe(2);
    });

    it('should throw NotFoundException if application not found', async () => {
      mockPrismaService.applicantProcess.findUnique.mockResolvedValue(null);
      await expect(service.getSingleApplication('p-1', 'ap-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllApplicationsForProcess', () => {
    it('should return all applications for a process with counts', async () => {
      mockPrismaService.process.findUnique.mockResolvedValue(mockProcess);
      mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcessPending]);

      const result = await service.getAllApplicationsForProcess('process-id-1');
      expect(result).toHaveLength(1);
      expect(result[0].completedFormsCount).toBe(1);
      expect(result[0].totalFormsCount).toBe(2);
    });

    it('should throw NotFoundException if process not found', async () => {
      mockPrismaService.process.findUnique.mockResolvedValue(null);
      await expect(service.getAllApplicationsForProcess('p-1')).rejects.toThrow(NotFoundException);
    });
  });
});
