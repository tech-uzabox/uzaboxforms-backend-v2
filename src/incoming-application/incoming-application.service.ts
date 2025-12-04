import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NextStepType, ProcessStatus } from 'db/client';
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
    lastCompletedForm: {
      reviewerId: string;
      nextStepType: NextStepType;
      nextStaffId: string;
      nextStepRoles: string[];
      nextStepSpecifiedTo?: string;
      formId?: string;
      applicantProcessId?: string;
    },
  ): Promise<boolean> {
    if (!lastCompletedForm) return false;

    switch (lastCompletedForm.nextStepType) {
      case NextStepType.STATIC:
        return lastCompletedForm.nextStaffId === user.id;

      case NextStepType.DYNAMIC:
        if (lastCompletedForm.nextStepSpecifiedTo === 'SINGLE_STAFF') {
          return lastCompletedForm.nextStaffId === user.id;
        } else {
          const userRoleIds = await this.getUserRoleIds(user.roles);
          return lastCompletedForm.nextStepRoles.some((roleId) =>
            userRoleIds.includes(roleId),
          );
        }

      case NextStepType.FOLLOW_ORGANIZATION_CHART:
        if (!lastCompletedForm.applicantProcessId) return false;

        const applicantProcess = await this.prisma.applicantProcess.findUnique({
          where: { id: lastCompletedForm.applicantProcessId },
        });

        if (!applicantProcess?.applicantId) return false;

        const applicantOrgUser = await this.prisma.organizationUser.findFirst({
          where: { userId: applicantProcess.applicantId },
        });

        if (!applicantOrgUser) return false;

        const currentUserOrg = await this.prisma.organizationUser.findFirst({
          where: { userId: user.id },
        });

        if (!currentUserOrg) return false;

        return applicantOrgUser.superiorId === currentUserOrg.id;

      case NextStepType.NOT_APPLICABLE:
        return true;

      default:
        return false;
    }
  }

  private async getUserRoleIds(roleNames: string[]): Promise<string[]> {
    if (!roleNames || roleNames.length === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: roleNames },
        status: 'ENABLED',
      },
      select: { id: true },
    });

    return roles.map((role) => role.id);
  }

  async getAllApplications(
    type: 'pending' | 'completed' | 'disabled' | 'processed',
    userId: string,
    actor: AuthenticatedUser,
    isAdminView: boolean = false,
  ): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        forms: { orderBy: { order: 'asc' } },
        group: true,
      },
    });

    const groupedApplications: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const statusFilter = type === 'disabled' ? ProcessStatus.DISABLED : ProcessStatus.ENABLED;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: statusFilter },
        include: {
          applicant: true,
          completedForms: { orderBy: { createdAt: 'asc' } },
          _count: { select: { completedForms: true } },
        },
      });

      const applicantProcessesForProcess: any[] = [];

      for (const ap of applicantProcesses) {
        const completedForms = await this.prisma.aPCompletedForm.findMany({
          where: { applicantProcessId: ap.id },
          orderBy: { createdAt: 'asc' },
        });

        const currentLevel = completedForms.length;

        if ((type === 'completed' || type === 'processed') && currentLevel < process.forms.length) {
          continue;
        }

        if ((type === 'pending' || type === 'disabled') && currentLevel >= process.forms.length) {
          continue;
        }

        const nextForm = process.forms[currentLevel];
        if (!nextForm && (type === 'pending' || type === 'disabled')) continue;

        const lastCompletedForm = completedForms[currentLevel - 1];

        let shouldInclude = false;

        if (isAdminView) {
          shouldInclude = true;
        } else {
          if (currentLevel === 0) {
            shouldInclude = true;
          } else if (lastCompletedForm) {
            shouldInclude = await this.userHasAccess(actor, {
              reviewerId: lastCompletedForm.reviewerId || '',
              nextStepType: lastCompletedForm.nextStepType,
              nextStaffId: lastCompletedForm.nextStaffId || '',
              nextStepRoles: lastCompletedForm.nextStepRoles,
              formId: lastCompletedForm.formId,
              applicantProcessId: lastCompletedForm.applicantProcessId,
            });
          }
        }

        if (!shouldInclude) continue;

        const applicationData: any = {
          applicantProcessId: ap.id,
          applicantId: ap.applicantId,
          applicant: ap.applicant,
          status: ap.status,
          completedForms: completedForms.map((cf) => cf.formId),
          processLevel: `${currentLevel}/${process.forms.length}`,
        };

        if (ap.status === ProcessStatus.ENABLED && nextForm) {
          applicationData.pendingForm = {
            formId: nextForm.formId,
            nextStepType: lastCompletedForm?.nextStepType || 'NOT_APPLICABLE',
            nextStepRoles: lastCompletedForm?.nextStepRoles || [],
            nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo,
          };
        }

        applicantProcessesForProcess.push(applicationData);
      }

      if (applicantProcessesForProcess.length > 0) {
        const groupIndex = groupedApplications.findIndex(
          (group) => group.groupId.toString() === process.groupId.toString(),
        );

        if (groupIndex !== -1) {
          groupedApplications[groupIndex].processes.push({
            processId: process.id,
            name: process.name,
            applicantProcesses: applicantProcessesForProcess,
          });
        } else {
          groupedApplications.push({
            groupName: process.group.name,
            groupId: process.group.id,
            processes: [
              {
              processId: process.id,
              name: process.name,
              applicantProcesses: applicantProcessesForProcess,
              },
            ],
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: `GET_${type.toUpperCase()}_APPLICATIONS`,
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedApplications.length },
    });

    return groupedApplications;
  }

  async getApplicationsForProcess(
    processId: string,
    type: 'pending' | 'completed' | 'disabled' | 'processed',
    userId: string,
    actor: AuthenticatedUser,
    isAdminView: boolean = false,
    status?: string,
  ): Promise<any> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { forms: { orderBy: { order: 'asc' } } },
    });

    if (!process || process.forms.length === 0) {
      return {
        process: {
          processId: process?.id || processId,
          name: process?.name || 'Unknown Process',
          groupId: process?.groupId,
          status: process?.status,
        },
        applicantProcesses: [],
      };
    }

    const statusFilter = type === 'disabled' || status === 'DISABLED' ? ProcessStatus.DISABLED : ProcessStatus.ENABLED;
    
    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id, status: statusFilter },
      include: {
        applicant: true,
        completedForms: { orderBy: { createdAt: 'asc' } },
        _count: { select: { completedForms: true } },
      },
    });

    const applicantProcessesForProcess: any[] = [];

    for (const ap of applicantProcesses) {
      const completedForms = await this.prisma.aPCompletedForm.findMany({
        where: { applicantProcessId: ap.id },
        orderBy: { createdAt: 'asc' },
      });

      const currentLevel = completedForms.length;

      if ((type === 'completed' || type === 'processed') && currentLevel < process.forms.length) {
        continue;
      }

      if ((type === 'pending' || type === 'disabled') && currentLevel >= process.forms.length) {
        continue;
      }

      const nextForm = process.forms[currentLevel];
      if (!nextForm && (type === 'pending' || type === 'disabled')) continue;

      const lastCompletedForm = completedForms[currentLevel - 1];

      let shouldInclude = false;

      if (isAdminView) {
        shouldInclude = true;
      } else {
        if (currentLevel === 0) {
          shouldInclude = true;
        } else if (lastCompletedForm) {
          shouldInclude = await this.userHasAccess(actor, {
            reviewerId: lastCompletedForm.reviewerId || '',
            nextStepType: lastCompletedForm.nextStepType,
            nextStaffId: lastCompletedForm.nextStaffId || '',
            nextStepRoles: lastCompletedForm.nextStepRoles,
            formId: lastCompletedForm.formId,
            applicantProcessId: lastCompletedForm.applicantProcessId,
          });
        }
      }

      if (!shouldInclude) continue;

      const editApplicationStatus = process.forms.find(
        (form) => form.formId === nextForm?.formId,
      )?.editApplicationStatus;

      const applicationData: any = {
        applicantProcessId: ap.id,
        applicantId: ap.applicantId,
        applicant: ap.applicant,
        status: ap.status,
        completedForms: completedForms.map((cf) => cf.formId),
        editApplicationStatus,
        processLevel: `${currentLevel}/${process.forms.length}`,
      };

      if (ap.status === ProcessStatus.ENABLED && nextForm) {
        applicationData.pendingForm = {
          formId: nextForm.formId,
          nextStepType: lastCompletedForm?.nextStepType || 'NOT_APPLICABLE',
          nextStepRoles: lastCompletedForm?.nextStepRoles || [],
          nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo,
        };
      }

      applicantProcessesForProcess.push(applicationData);
    }

    const response = {
      process: {
        processId: process.id,
        name: process.name,
        groupId: process.groupId,
        status: process.status,
      },
      applicantProcesses: applicantProcessesForProcess,
    };

    await this.auditLogService.log({
      userId: actor.id,
      action: `GET_${type.toUpperCase()}_APPLICATIONS_FOR_PROCESS`,
      resource: 'IncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: applicantProcessesForProcess.length },
    });

    return response;
  }

  async getSingleApplication(
    applicantProcessId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
      include: {
        applicant: true,
        process: { 
          include: { 
            forms: { 
              orderBy: { order: 'asc' },
              include: { form: true },
            },
          },
        },
        completedForms: { orderBy: { createdAt: 'desc' } },
        responses: { include: { form: true } },
      },
    });

    if (!applicantProcess) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_SINGLE_APPLICATION',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Applicant process not found.',
      });
      throw new NotFoundException('Applicant process not found.');
    }

    const lastCompletedForm = applicantProcess.completedForms[0];
    const processForm = lastCompletedForm
      ? await this.prisma.processForm.findFirst({
          where: {
            processId: applicantProcess.processId,
            formId: lastCompletedForm.formId,
          },
        })
      : null;

    const hasAccess = await this.userHasAccess(actor, {
        reviewerId: lastCompletedForm?.reviewerId || '',
        nextStepType: processForm?.nextStepType || NextStepType.NOT_APPLICABLE,
        nextStaffId: processForm?.nextStaffId || '',
        nextStepRoles: processForm?.nextStepRoles || [],
        formId: lastCompletedForm?.formId,
        applicantProcessId: lastCompletedForm?.applicantProcessId,
    });

    if (!hasAccess && applicantProcess.applicantId !== userId) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_SINGLE_APPLICATION',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Unauthorized access.',
      });
      throw new ForbiddenException(
        'You are not authorized to access this application.',
      );
    }

    const currentLevel = applicantProcess.completedForms.length;
    const nextForm = applicantProcess.process.forms[currentLevel];

    const editApplicationStatus = applicantProcess.process.forms.find(
      (form) => form.formId === nextForm?.formId,
    )?.editApplicationStatus;

    const completedForms = await Promise.all(
      applicantProcess.completedForms.map(async (completedForm) => {
        const processForm = applicantProcess.process.forms.find(
          (pf) => pf.formId === completedForm.formId,
        );

        let reviewer: any = null;
        if (completedForm.reviewerId) {
          reviewer = await this.prisma.user.findUnique({
            where: { id: completedForm.reviewerId },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
        }

      return {
          id: completedForm.formId,
          formName: processForm?.form.name || 'Unknown Form',
          order: processForm?.order || 0,
          completedAt: completedForm.createdAt,
          reviewerId: completedForm.reviewerId,
          reviewer: reviewer,
          nextStepType: processForm?.nextStepType || 'NOT_APPLICABLE',
          nextStepRoles: processForm?.nextStepRoles || [],
          nextStepSpecifiedTo: processForm?.nextStepSpecifiedTo,
          notificationComment: processForm?.notificationComment,
        };
      }),
    );

    const pendingForm =
      nextForm && applicantProcess.status === ProcessStatus.ENABLED
        ? {
            id: nextForm.formId,
            formName: nextForm.form.name,
            order: nextForm.order,
            config: {
              nextStepType: lastCompletedForm?.nextStepType || 'NOT_APPLICABLE',
              nextStepRoles: lastCompletedForm?.nextStepRoles || [],
              nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo,
            },
          }
        : null;

    const response = {
      process: {
        id: applicantProcess.process.id,
        name: applicantProcess.process.name,
        type: applicantProcess.process.type || 'DEFAULT',
        group: applicantProcess.process.groupId,
      },
      application: {
        id: applicantProcess.id,
        applicant: {
          id: applicantProcess.applicant.id,
          firstName: applicantProcess.applicant.firstName,
          lastName: applicantProcess.applicant.lastName,
          email: applicantProcess.applicant.email,
        },
        status: applicantProcess.status,
        currentLevel,
        totalForms: applicantProcess.process.forms.length,
        createdAt: applicantProcess.createdAt,
        isCompleted: currentLevel >= applicantProcess.process.forms.length,
        progress: (
          (currentLevel / applicantProcess.process.forms.length) *
          100
        ).toFixed(1),
        editApplicationStatus,
      },
      completedForms,
      pendingForm,
      access: {
        canEdit: editApplicationStatus,
        canView: true,
        canApprove: hasAccess,
        assignedTo: {
          type:
            lastCompletedForm?.nextStepType === 'STATIC'
              ? 'user'
              : lastCompletedForm?.nextStepType === 'DYNAMIC'
                ? 'role'
                : 'organization',
          value:
            lastCompletedForm?.nextStaffId ||
            lastCompletedForm?.nextStepRoles?.[0] ||
            '',
        },
      },
    };

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_SINGLE_APPLICATION',
      resource: 'IncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return response;
  }
}
