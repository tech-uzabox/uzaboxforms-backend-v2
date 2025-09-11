import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess, Form, FormResponse, Process, User } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { AnalyticsService } from './analytics.service';

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

const mockForm: Form = {
  id: 'form-id-1',
  name: 'Test Form',
  type: 'INTERNAL',
  status: 'ENABLED',
  archived: false,
  creatorId: 'creator-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  design: {},
};

const mockApplicantProcess: ApplicantProcess & { applicant: User } = {
  id: 'app-proc-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: 'ENABLED',
  createdAt: new Date(),
  applicant: mockUser,
};

const mockProcess: Process & { applicantProcesses: ApplicantProcess[] } = {
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
  applicantProcesses: [mockApplicantProcess],
};

const mockFormResponse: FormResponse & { form: Form } = {
  id: 'resp-id-1',
  processId: 'process-id-1',
  formId: 'form-id-1',
  applicantProcessId: 'app-proc-id-1',
  responses: {},
  createdAt: new Date(),
  form: mockForm,
};

const mockPrismaService = {
  $queryRaw: jest.fn(),
  formResponse: {
    findMany: jest.fn(),
  },
  applicantProcess: {
    findMany: jest.fn(),
  },
  process: {
    findMany: jest.fn(),
  },
  form: {
    findMany: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$queryRaw.mockResolvedValue([{ year: 2023, month: 9, count: 10 }]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFormAnalyticsData', () => {
    it('should return form analytics data', async () => {
      mockPrismaService.formResponse.findMany.mockResolvedValue([
        mockFormResponse,
      ]);

      const result = await service.getFormAnalyticsData(
        'process-id-1',
        'form-id-1',
      );
      expect(result).toEqual([mockFormResponse]);
      expect(prisma.formResponse.findMany).toHaveBeenCalledWith({
        where: { processId: 'process-id-1', formId: 'form-id-1' },
      });
    });
  });

  describe('getApplicationsAnalytics', () => {
    it('should return applications analytics', async () => {
      const result = await service.getApplicationsAnalytics();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'GET_APPLICATIONS_ANALYTICS',
        resource: 'Analytics',
        status: 'SUCCESS',
        details: { years: expect.any(Number) },
      });
    });
  });

  describe('getProcessAnalytics', () => {
    it('should return process analytics', async () => {
      const result = await service.getProcessAnalytics();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'GET_PROCESS_ANALYTICS',
        resource: 'Analytics',
        status: 'SUCCESS',
        details: { count: expect.any(Number) },
      });
    });
  });

  describe('getFormResponseAnalytics', () => {
    it('should return form response analytics', async () => {
      const result = await service.getFormResponseAnalytics();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'GET_FORM_RESPONSE_ANALYTICS',
        resource: 'Analytics',
        status: 'SUCCESS',
        details: { count: expect.any(Number) },
      });
    });
  });

  describe('getMonthlyApplicantProcessesCount', () => {
    it('should return monthly applicant processes count', async () => {
      const result = await service.getMonthlyApplicantProcessesCount();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'GET_MONTHLY_APPLICANT_PROCESSES_COUNT',
        resource: 'Analytics',
        status: 'SUCCESS',
        details: { count: expect.any(Number) },
      });
    });
  });

  describe('getProcessDistributionData', () => {
    it('should return process distribution data', async () => {
      const result = await service.getProcessDistributionData();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'GET_PROCESS_DISTRIBUTION_DATA',
        resource: 'Analytics',
        status: 'SUCCESS',
        details: { count: expect.any(Number) },
      });
    });
  });
});
