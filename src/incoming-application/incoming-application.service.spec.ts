import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User, Process, ApplicantProcess, APCompletedForm, ProcessForm, OrganizationUser, Role, NextStepType, ProcessStatus, RoleStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { PrismaService } from '../db/prisma.service';
import { IncomingApplicationService } from './incoming-application.service';

// Mock Data
const mockAdminUser: AuthenticatedUser = {
  id: 'admin-id',
  email: 'admin@test.com',
  roles: ['Admin'],
  status: 'ENABLED',
  firstName: 'Admin',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
  googleId: null,
  photo: null,
};

const mockStaffUser: AuthenticatedUser = {
  id: 'staff-id-1',
  email: 'staff1@test.com',
  roles: ['Staff'],
  status: 'ENABLED',
  firstName: 'Staff',
  lastName: 'One',
  createdAt: new Date(),
  updatedAt: new Date(),
  googleId: null,
  photo: null,
};

const mockApplicant: User = {
    id: 'applicant-id',
    email: 'applicant@test.com',
    password: 'hashed',
    firstName: 'Applicant',
    lastName: 'User',
    photo: null,
    googleId: null,
    status: 'ENABLED',
    createdAt: new Date(),
    updatedAt: new Date(),
}

const mockProcess1: Process & { forms: ProcessForm[] } = {
    id: 'process-1',
    name: 'Test Process 1',
    type: 'PRIVATE',
    groupId: 'group-1',
    creatorId: 'creator-1',
    status: 'ENABLED',
    archived: false,
    staffViewForms: true,
    applicantViewProcessLevel: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    forms: [
        { id: 'pf-1', processId: 'process-1', formId: 'form-1', order: 1, nextStepType: NextStepType.STATIC, nextStaffId: 'staff-id-1', nextStepRoles: [], notificationType: 'NOT_APPLICABLE', notificationRoles: [], notificationToId: null, notificationComment: null, notifyApplicant: false, applicantNotificationContent: null },
        { id: 'pf-2', processId: 'process-1', formId: 'form-2', order: 2, nextStepType: NextStepType.DYNAMIC, nextStaffId: null, nextStepRoles: ['Admin'], notificationType: 'NOT_APPLICABLE', notificationRoles: [], notificationToId: null, notificationComment: null, notifyApplicant: false, applicantNotificationContent: null },
    ]
}

const mockApplicantProcess1: ApplicantProcess & { applicant: User, completedForms: (APCompletedForm & { form: any })[], _count: { completedForms: number } } = {
    id: 'ap-1',
    applicantId: 'applicant-id',
    processId: 'process-1',
    status: 'ENABLED',
    createdAt: new Date(),
    applicant: mockApplicant,
    completedForms: [
        { id: 'apc-1', applicantProcessId: 'ap-1', formId: 'form-1', reviewerId: 'reviewer-1', createdAt: new Date(), form: { id: 'form-1' } }
    ],
    _count: { completedForms: 1 }
}

const mockPrismaService = {
  process: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  applicantProcess: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  processForm: {
      findFirst: jest.fn(),
  },
  organizationUser: {
      findFirst: jest.fn(),
  }
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('IncomingApplicationService', () => {
  let service: IncomingApplicationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomingApplicationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<IncomingApplicationService>(IncomingApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPendingApplications', () => {
    it('should return applications where the user has access based on STATIC next step', async () => {
      mockPrismaService.process.findMany.mockResolvedValue([mockProcess1]);
      mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcess1]);
      mockPrismaService.processForm.findFirst.mockResolvedValue(mockProcess1.forms[0]);

      const result = await service.getPendingApplications(mockStaffUser.id, mockStaffUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ap-1');
    });

    it('should not return applications where the user does not have access', async () => {
        mockPrismaService.process.findMany.mockResolvedValue([mockProcess1]);
        mockPrismaService.applicantProcess.findMany.mockResolvedValue([mockApplicantProcess1]);
        mockPrismaService.processForm.findFirst.mockResolvedValue(mockProcess1.forms[0]);
  
        const otherStaffUser = { ...mockStaffUser, id: 'staff-id-2' };
        const result = await service.getPendingApplications(otherStaffUser.id, otherStaffUser);
  
        expect(result).toHaveLength(0);
      });

    it('should return applications where the user has access based on DYNAMIC role', async () => {
        const processWithDynamicRole = {
            ...mockProcess1,
            forms: [
                { ...mockProcess1.forms[0], nextStepType: NextStepType.DYNAMIC, nextStepRoles: ['Admin'] },
                { ...mockProcess1.forms[1] }
            ]
        };
        const applicantProcess = { ...mockApplicantProcess1, completedForms: [{ ...mockApplicantProcess1.completedForms[0], formId: 'form-1' }] };
        mockPrismaService.process.findMany.mockResolvedValue([processWithDynamicRole]);
        mockPrismaService.applicantProcess.findMany.mockResolvedValue([applicantProcess]);
        mockPrismaService.processForm.findFirst.mockResolvedValue(processWithDynamicRole.forms[0]);

        const result = await service.getPendingApplications(mockAdminUser.id, mockAdminUser);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('ap-1');
    });
  });

});
