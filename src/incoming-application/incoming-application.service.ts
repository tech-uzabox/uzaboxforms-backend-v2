import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NextStepType, ProcessStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class IncomingApplicationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  private async userHasAccess(
    user: AuthenticatedUser,
    lastCompletedForm: { reviewerId: string; nextStepType: NextStepType; nextStaffId: string; nextStepRoles: string[] },
  ): Promise<boolean> {
    if (!lastCompletedForm) return false;

    switch (lastCompletedForm.nextStepType) {
      case NextStepType.STATIC:
        return lastCompletedForm.nextStaffId === user.id;
      case NextStepType.DYNAMIC:
        return user.roles.some(role => lastCompletedForm.nextStepRoles.includes(role));
      case NextStepType.FOLLOW_ORGANIZATION_CHART:
        if (!lastCompletedForm.reviewerId) return false;
        const reviewerOrgUser = await this.prisma.organizationUser.findFirst({
          where: { userId: lastCompletedForm.reviewerId },
        });
        return reviewerOrgUser?.superiorId === user.id;
      case NextStepType.NOT_APPLICABLE:
        return true; // Or based on some other role/permission
      default:
        return false;
    }
  }

  async getPendingApplications(
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: { forms: { orderBy: { order: 'asc' } } },
    });

    const allPendingApplications: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: {
          applicant: true,
          completedForms: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { completedForms: true } },
        },
      });

      for (const ap of applicantProcesses) {
        if (ap._count.completedForms >= process.forms.length) continue; // Skip completed

        const lastCompletedForm = ap.completedForms[0];
        if (!lastCompletedForm) continue; // Should not happen if count > 0, but for safety

        const processForm = await this.prisma.processForm.findFirst({
            where: { processId: process.id, formId: lastCompletedForm.formId }
        });

        if (!processForm) continue;

        const hasAccess = await this.userHasAccess(actor, {
            reviewerId: lastCompletedForm.reviewerId || '',
            nextStepType: processForm.nextStepType,
            nextStaffId: processForm.nextStaffId || '',
            nextStepRoles: processForm.nextStepRoles,
        });

        if (hasAccess) {
          allPendingApplications.push({
            id: ap.id,
            applicantId: ap.applicantId,
            applicantEmail: ap.applicant.email,
            processId: process.id,
            processName: process.name,
            status: 'Pending',
            createdAt: ap.createdAt,
            currentStep: ap._count.completedForms + 1,
            totalSteps: process.forms.length,
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_PENDING_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: allPendingApplications.length },
    });

    return allPendingApplications;
  }

  async getPendingApplicationForProcess(
    processId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { forms: { orderBy: { order: 'asc' } } },
    });

    if (!process || process.forms.length === 0) {
      return [];
    }

    const pendingApplications: any[] = [];
    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id, status: ProcessStatus.ENABLED },
      include: {
        applicant: true,
        completedForms: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { completedForms: true } },
      },
    });

    for (const ap of applicantProcesses) {
      if (ap._count.completedForms >= process.forms.length) continue;

      const lastCompletedForm = ap.completedForms[0];
      if (!lastCompletedForm) continue;

      const processForm = await this.prisma.processForm.findFirst({
          where: { processId: process.id, formId: lastCompletedForm.formId }
      });

      if (!processForm) continue;

      const hasAccess = await this.userHasAccess(actor, {
          reviewerId: lastCompletedForm.reviewerId || '',
          nextStepType: processForm.nextStepType,
          nextStaffId: processForm.nextStaffId || '',
          nextStepRoles: processForm.nextStepRoles,
      });

      if (hasAccess) {
        pendingApplications.push({
          id: ap.id,
          applicantId: ap.applicantId,
          applicantEmail: ap.applicant.email,
          status: 'Pending',
          createdAt: ap.createdAt,
          currentStep: ap._count.completedForms + 1,
          totalSteps: process.forms.length,
        });
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_PENDING_APPLICATIONS_FOR_PROCESS',
      resource: 'IncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: pendingApplications.length },
    });

    return pendingApplications;
  }

  async getSingleApplicantProcess(
    applicantProcessId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
      include: {
        applicant: true,
        process: { include: { forms: { orderBy: { order: 'asc' } } } },
        completedForms: { orderBy: { createdAt: 'desc' } },
        responses: { include: { form: true } },
      },
    });

    if (!applicantProcess) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_SINGLE_APPLICANT_PROCESS',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Applicant process not found.',
      });
      throw new NotFoundException('Applicant process not found.');
    }

    const lastCompletedForm = applicantProcess.completedForms[0];
    const processForm = lastCompletedForm ? await this.prisma.processForm.findFirst({
        where: { processId: applicantProcess.processId, formId: lastCompletedForm.formId }
    }) : null;

    const hasAccess = await this.userHasAccess(actor, {
        reviewerId: lastCompletedForm?.reviewerId || '',
        nextStepType: processForm?.nextStepType || NextStepType.NOT_APPLICABLE,
        nextStaffId: processForm?.nextStaffId || '',
        nextStepRoles: processForm?.nextStepRoles || [],
    });

    if (!hasAccess && applicantProcess.applicantId !== userId) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_SINGLE_APPLICANT_PROCESS',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Unauthorized access.',
      });
      throw new ForbiddenException(
        'You are not authorized to access this application.',
      );
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_SINGLE_APPLICANT_PROCESS',
      resource: 'IncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return applicantProcess;
  }

  async getCompletedApplications(
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: { forms: true },
    });

    const completedApplications: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: {
          applicant: true,
          _count: { select: { completedForms: true } },
        },
      });

      for (const ap of applicantProcesses) {
        if (ap._count.completedForms === process.forms.length) {
          // Simplified access control for completed applications
          // In a real scenario, you might want to check if the user was involved in the process
          completedApplications.push({
            id: ap.id,
            applicantId: ap.applicantId,
            applicantEmail: ap.applicant.email,
            processId: process.id,
            processName: process.name,
            status: 'Completed',
            createdAt: ap.createdAt,
            completedFormsCount: ap._count.completedForms,
            totalFormsCount: process.forms.length,
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_COMPLETED_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: completedApplications.length },
    });

    return completedApplications;
  }

  async getCompletedFormsForProcess(
    processId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    // This method seems redundant if getCompletedApplications is already process-aware.
    // Refactoring to be consistent.
    const process = await this.prisma.process.findUnique({
        where: { id: processId },
        include: { forms: true }
    });

    if (!process || process.forms.length === 0) return [];

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id, status: ProcessStatus.ENABLED },
      include: {
        applicant: true,
        _count: { select: { completedForms: true } },
      },
    });

    const completedForms = applicantProcesses
        .filter(ap => ap._count.completedForms === process.forms.length)
        .map(ap => ({
            id: ap.id,
            applicantId: ap.applicantId,
            applicantEmail: ap.applicant.email,
            completedFormsCount: ap._count.completedForms,
            totalFormsCount: process.forms.length,
        }));

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_COMPLETED_FORMS_FOR_PROCESS',
      resource: 'IncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: completedForms.length },
    });

    return completedForms;
  }

  async getCompletedSingleApplicantProcess(
    applicantProcessId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
      include: {
        applicant: true,
        process: { include: { forms: true } },
        completedForms: true,
      },
    });

    if (!applicantProcess) {
      throw new NotFoundException('Applicant process not found.');
    }

    if (applicantProcess.completedForms.length !== applicantProcess.process.forms.length) {
        throw new NotFoundException('This application is not yet completed.');
    }

    // Simplified access control for completed applications
    if (applicantProcess.applicantId !== userId && !actor.roles.includes('Admin')) {
        throw new ForbiddenException('You are not authorized to access this application.');
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_COMPLETED_SINGLE_APPLICANT_PROCESS',
      resource: 'IncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return applicantProcess;
  }

  async getDisabledApplications(
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    // Simplified implementation, but more direct query
    const disabledProcesses = await this.prisma.applicantProcess.findMany({
      where: { status: ProcessStatus.DISABLED },
      include: { 
          process: { include: { group: true } }, 
          applicant: true 
        },
    });

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_DISABLED_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: disabledProcesses.length },
    });

    return disabledProcesses.map((ap) => ({
      id: ap.id,
      applicantId: ap.applicantId,
      applicantEmail: ap.applicant.email,
      processId: ap.process.id,
      processName: ap.process.name,
      groupName: ap.process.group.name,
      status: ap.status,
      createdAt: ap.createdAt,
    }));
  }
}
