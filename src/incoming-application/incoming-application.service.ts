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

  // Compute access without DB calls using preloaded context to avoid N+1
  private computeAccessWithContext(
    actor: AuthenticatedUser,
    lastCompletedForm:
      | {
          nextStepType: NextStepType;
          nextStaffId?: string | null;
          nextStepRoles?: string[];
          nextStepSpecifiedTo?: string | null;
        }
      | undefined,
    ctx: {
      actorRoleIds: string[];
      actorOrgUser?: { id: string } | null;
      applicantOrgUser?: { superiorId?: string | null } | null;
    },
  ): boolean {
    if (!lastCompletedForm) return false;

    switch (lastCompletedForm.nextStepType) {
      case NextStepType.STATIC:
        return (lastCompletedForm.nextStaffId || '') === actor.id;

      case NextStepType.DYNAMIC: {
        if (lastCompletedForm.nextStepSpecifiedTo === 'SINGLE_STAFF') {
          return (lastCompletedForm.nextStaffId || '') === actor.id;
        }
        const nextRoles = lastCompletedForm.nextStepRoles || [];
        if (!nextRoles.length || !ctx.actorRoleIds.length) return false;
        return nextRoles.some((r) => ctx.actorRoleIds.includes(r));
      }

      case NextStepType.FOLLOW_ORGANIZATION_CHART:
        return (
          (ctx.applicantOrgUser?.superiorId || null) ===
          (ctx.actorOrgUser?.id || null)
        );

      case NextStepType.NOT_APPLICABLE:
        return true;

      default:
        return false;
    }
  }

  // 1. Get all applications by type
  async getAllApplications(
    type: 'pending' | 'completed' | 'disabled' | 'processed',
    userId: string,
    actor: AuthenticatedUser,
    isAdminView: boolean = false,
  ): Promise<any[]> {
    // 1) Load processes (enabled) with forms and group once
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        forms: { orderBy: { order: 'asc' } },
        group: true,
      },
    });

    // Build lookup maps for quick access
    const processById = new Map<string, any>();
    const processIds: string[] = [];
    for (const p of processes) {
      if (!p.forms || p.forms.length === 0) continue;
      processById.set(p.id, p);
      processIds.push(p.id);
    }

    if (processIds.length === 0) {
      await this.auditLogService.log({
        userId: actor.id,
        action: `GET_${type.toUpperCase()}_APPLICATIONS`,
        resource: 'IncomingApplication',
        status: 'SUCCESS',
        details: { count: 0 },
      });
      return [];
    }

    // Determine status filter for applicant processes
    const statusFilter =
      type === 'disabled' ? ProcessStatus.DISABLED : ProcessStatus.ENABLED;

    // 2) Batch fetch applicant processes across all processes
    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: { in: processIds }, status: statusFilter },
      include: {
        applicant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        completedForms: {
          orderBy: { createdAt: 'asc' },
          select: {
            formId: true,
            reviewerId: true,
            nextStepType: true,
            nextStaffId: true,
            nextStepRoles: true,
            nextStepSpecifiedTo: true,
            applicantProcessId: true,
            createdAt: true,
          },
        },
      },
    });

    // 3) Preload access context (roles and org chart) once
    const [actorRoleIds, actorOrgUser] = await Promise.all([
      this.getUserRoleIds(actor.roles),
      this.prisma.organizationUser.findFirst({
        where: { userId: actor.id },
        select: { id: true },
      }),
    ]);

    const applicantIds = Array.from(
      new Set(applicantProcesses.map((ap) => ap.applicantId)),
    );

    const applicantOrgUsers =
      applicantIds.length > 0
        ? await this.prisma.organizationUser.findMany({
            where: { userId: { in: applicantIds } },
            select: { userId: true, superiorId: true },
          })
        : [];

    const applicantOrgUserByUserId = new Map<string, { superiorId?: string | null }>();
    for (const ou of applicantOrgUsers) {
      applicantOrgUserByUserId.set(ou.userId, { superiorId: ou.superiorId });
    }

    // 4) Build grouped applications using Maps for O(1) grouping
    const groupAgg = new Map<
      string,
      {
        groupName: string;
        groupId: string;
        processes: Map<
          string,
          { processId: string; name: string; applicantProcesses: any[] }
        >;
      }
    >();

    for (const ap of applicantProcesses) {
      const process = processById.get(ap.processId);
      if (!process) continue;

      const totalForms = process.forms.length;
      const completedForms = ap.completedForms || [];
      const currentLevel = completedForms.length;

      // Type-based filtering
      if (
        (type === 'completed' || type === 'processed') &&
        currentLevel < totalForms
      ) {
        continue;
      }
      if (
        (type === 'pending' || type === 'disabled') &&
        currentLevel >= totalForms
      ) {
        continue;
      }

      const nextForm = process.forms[currentLevel];
      if (!nextForm && (type === 'pending' || type === 'disabled')) {
        continue;
      }

      const lastCompletedForm =
        currentLevel > 0 ? completedForms[currentLevel - 1] : undefined;

      // Access control
      let shouldInclude = false;
      if (isAdminView) {
        shouldInclude = true;
      } else {
        if (currentLevel === 0) {
          shouldInclude = true;
        } else if (lastCompletedForm) {
          shouldInclude = this.computeAccessWithContext(
            actor,
            lastCompletedForm as any,
            {
              actorRoleIds,
              actorOrgUser,
              applicantOrgUser:
                applicantOrgUserByUserId.get(ap.applicantId) || null,
            },
          );
        }
      }
      if (!shouldInclude) continue;

      const applicationData: any = {
        applicantProcessId: ap.id,
        applicantId: ap.applicantId,
        applicant: ap.applicant,
        status: ap.status,
        completedForms: completedForms.map((cf: any) => cf.formId),
        processLevel: `${currentLevel}/${totalForms}`,
      };

      if (ap.status === ProcessStatus.ENABLED && nextForm) {
        applicationData.pendingForm = {
          formId: nextForm.formId,
          nextStepType: lastCompletedForm?.nextStepType || 'NOT_APPLICABLE',
          nextStepRoles: lastCompletedForm?.nextStepRoles || [],
          nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo,
        };
      }

      // Group -> Process -> applicantProcesses
      const groupId = process.groupId as string;
      let groupEntry = groupAgg.get(groupId);
      if (!groupEntry) {
        groupEntry = {
          groupName: process.group.name,
          groupId: process.group.id,
          processes: new Map(),
        };
        groupAgg.set(groupId, groupEntry);
      }

      let procEntry = groupEntry.processes.get(process.id);
      if (!procEntry) {
        procEntry = {
          processId: process.id,
          name: process.name,
          applicantProcesses: [],
        };
        groupEntry.processes.set(process.id, procEntry);
      }

      procEntry.applicantProcesses.push(applicationData);
    }

    // 5) Materialize result
    const groupedApplications: any[] = [];
    for (const groupEntry of groupAgg.values()) {
      groupedApplications.push({
        groupName: groupEntry.groupName,
        groupId: groupEntry.groupId,
        processes: Array.from(groupEntry.processes.values()),
      });
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

  // 2. Get applications for a specific process by type
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

    const statusFilter =
      type === 'disabled' || status === 'DISABLED'
        ? ProcessStatus.DISABLED
        : ProcessStatus.ENABLED;

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id, status: statusFilter },
      include: {
        applicant: true,
        completedForms: {
          orderBy: { createdAt: 'asc' },
          select: {
            formId: true,
            reviewerId: true,
            nextStepType: true,
            nextStaffId: true,
            nextStepRoles: true,
            nextStepSpecifiedTo: true,
            applicantProcessId: true,
            createdAt: true,
          },
        },
        _count: { select: { completedForms: true } },
      },
    });

    // Preload access context (roles and org chart) once to avoid N+1 queries
    const [actorRoleIds, actorOrgUser] = await Promise.all([
      this.getUserRoleIds(actor.roles),
      this.prisma.organizationUser.findFirst({
        where: { userId: actor.id },
        select: { id: true },
      }),
    ]);

    const applicantIds = Array.from(
      new Set(applicantProcesses.map((ap) => ap.applicantId)),
    );

    const applicantOrgUsers =
      applicantIds.length > 0
        ? await this.prisma.organizationUser.findMany({
            where: { userId: { in: applicantIds } },
            select: { userId: true, superiorId: true },
          })
        : [];

    const applicantOrgUserByUserId = new Map<string, { superiorId?: string | null }>();
    for (const ou of applicantOrgUsers) {
      applicantOrgUserByUserId.set(ou.userId, { superiorId: ou.superiorId });
    }

    const applicantProcessesForProcess: any[] = [];

    for (const ap of applicantProcesses) {
      // Use already loaded completedForms instead of querying again
      const completedForms = ap.completedForms || [];

      const currentLevel = completedForms.length;

      // For completed/processed: only include if all forms are completed
      if (
        (type === 'completed' || type === 'processed') &&
        currentLevel < process.forms.length
      ) {
        continue;
      }

      // For pending/disabled: only include if not all forms are completed
      if (
        (type === 'pending' || type === 'disabled') &&
        currentLevel >= process.forms.length
      ) {
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
          // Use preloaded context to avoid N+1 queries
          shouldInclude = this.computeAccessWithContext(
            actor,
            lastCompletedForm as any,
            {
              actorRoleIds,
              actorOrgUser,
              applicantOrgUser:
                applicantOrgUserByUserId.get(ap.applicantId) || null,
            },
          );
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

      // Only add pendingForm for ENABLED applications
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

  // 3. Get single application details
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

    // Batch fetch all reviewers to avoid N+1 queries
    const reviewerIds = Array.from(
      new Set(
        applicantProcess.completedForms
          .map((cf) => cf.reviewerId)
          .filter((id): id is string => !!id),
      ),
    );

    const reviewers =
      reviewerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];

    const reviewerById = new Map(
      reviewers.map((r) => [r.id, r]),
    );

    // Create completed forms array with reviewer information
    const completedForms = applicantProcess.completedForms.map((completedForm) => {
      const processForm = applicantProcess.process.forms.find(
        (pf) => pf.formId === completedForm.formId,
      );

      const reviewer = completedForm.reviewerId
        ? reviewerById.get(completedForm.reviewerId) || null
        : null;

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
    });

    // Create pending form only for ENABLED applications
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
