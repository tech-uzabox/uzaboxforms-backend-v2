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
          // Check if user has any of the required roles
          return lastCompletedForm.nextStepRoles.some(role => user.roles.includes(role));
        }

      case NextStepType.FOLLOW_ORGANIZATION_CHART:
        if (!lastCompletedForm.applicantProcessId) return false;

        // Get the applicant process to find the applicant
        const applicantProcess = await this.prisma.applicantProcess.findUnique({
          where: { id: lastCompletedForm.applicantProcessId },
        });

        if (!applicantProcess?.applicantId) return false;

        // Get the applicant's organization info
        const applicantOrgUser = await this.prisma.organizationUser.findFirst({
          where: { userId: applicantProcess.applicantId },
        });

        if (!applicantOrgUser) return false;

        // Get current user's organization info
        const currentUserOrg = await this.prisma.organizationUser.findFirst({
          where: { userId: user.id },
        });

        if (!currentUserOrg) return false;

        // Check if current user is the applicant's superior
        return applicantOrgUser.superiorId === currentUserOrg.id;

      case NextStepType.NOT_APPLICABLE:
        return true; // Allow access for completed processes

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
      include: {
        forms: { orderBy: { order: 'asc' } },
        group: true
      },
    });

    const groupedPendingApplications: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: {
          completedForms: { orderBy: { createdAt: 'desc' } },
          _count: { select: { completedForms: true } },
        },
      });

      const applicantProcessesForProcess: any[] = [];

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
            formId: lastCompletedForm.formId,
            applicantProcessId: lastCompletedForm.applicantProcessId,
        });

        if (hasAccess) {
          const currentLevel = ap._count.completedForms;
          const nextForm = process.forms[currentLevel];

          applicantProcessesForProcess.push({
            applicantProcessId: ap.id,
            applicantId: ap.applicantId,
            status: ap.status,
            completedForms: ap.completedForms.map(cf => cf.formId),
            pendingForm: {
              formId: nextForm?.formId,
              nextStepType: lastCompletedForm?.nextStepType || "NOT_APPLICABLE",
              nextStepRoles: lastCompletedForm?.nextStepRoles || [],
              nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo
            },
            processLevel: `${currentLevel}/${process.forms.length}`,
          });
        }
      }

      if (applicantProcessesForProcess.length > 0) {
        // Grouping logic
        const groupIndex = groupedPendingApplications.findIndex(
          group => group.groupId.toString() === process.groupId.toString()
        );

        if (groupIndex !== -1) {
          groupedPendingApplications[groupIndex].processes.push({
            processId: process.id,
            name: process.name,
            applicantProcesses: applicantProcessesForProcess,
          });
        } else {
          groupedPendingApplications.push({
            groupName: process.group.name,
            groupId: process.group.id,
            processes: [{
              processId: process.id,
              name: process.name,
              applicantProcesses: applicantProcessesForProcess,
            }],
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_PENDING_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedPendingApplications.length },
    });

    return groupedPendingApplications;
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
          formId: lastCompletedForm.formId,
          applicantProcessId: lastCompletedForm.applicantProcessId,
      });

      if (hasAccess) {
        const currentLevel = ap._count.completedForms;
        const nextForm = process.forms[currentLevel];

        const editApplicationStatus = process.forms.find((form) => form.formId === nextForm?.formId)?.editApplicationStatus;

        pendingApplications.push({
          applicantProcessId: ap.id,
          applicantId: ap.applicantId,
          status: ap.status,
          completedForms: ap.completedForms.map(cf => cf.formId),
          pendingForm: {
            formId: nextForm?.formId,
            nextStepType: lastCompletedForm?.nextStepType || "NOT_APPLICABLE",
            nextStepRoles: lastCompletedForm?.nextStepRoles || [],
            nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo
          },
          editApplicationStatus,
          processLevel: `${currentLevel}/${process.forms.length}`,
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
        formId: lastCompletedForm?.formId,
        applicantProcessId: lastCompletedForm?.applicantProcessId,
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

    const currentLevel = applicantProcess.completedForms.length;
    const nextForm = applicantProcess.process.forms[currentLevel];

    const editApplicationStatus = applicantProcess.process.forms.find((form) => form.formId === nextForm?.formId)?.editApplicationStatus;

    const response = {
      process: {
        processId: applicantProcess.process.id,
        name: applicantProcess.process.name,
        groupId: applicantProcess.process.groupId,
        status: applicantProcess.process.status,
      },
      applicantProcess: {
        applicantProcessId: applicantProcess.id,
        applicantId: applicantProcess.applicantId,
        status: applicantProcess.status,
        completedForms: applicantProcess.completedForms.map(cf => cf.formId),
        pendingForm: nextForm ? {
          formId: nextForm.formId,
          nextStepType: lastCompletedForm?.nextStepType || "NOT_APPLICABLE",
          nextStepRoles: lastCompletedForm?.nextStepRoles || [],
          nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo
        } : null,
        processLevel: `${currentLevel}/${applicantProcess.process.forms.length}`,
        editApplicationStatus
      }
    };

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_SINGLE_APPLICANT_PROCESS',
      resource: 'IncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return response;
  }

  async getCompletedApplications(
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        forms: { orderBy: { order: 'asc' } },
        group: true
      },
    });

    const groupedByGroup: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: {
          completedForms: { orderBy: { createdAt: 'asc' } },
          _count: { select: { completedForms: true } },
        },
      });

      const applicantProcessesForProcess: any[] = [];

      for (const ap of applicantProcesses) {
        if (ap._count.completedForms === process.forms.length) {
          let visibleForms: string[] = [];

          // Handle staff view permission
          if (!process.staffViewForms) { // staffViewForms === false means NO
            visibleForms = [];
            for (const [index, form] of ap.completedForms.entries()) {
              let hasAccess = false;

              // Get the form response to check access
              const formResponse = await this.prisma.formResponse.findFirst({
                where: {
                  formId: form.formId,
                  applicantProcessId: form.applicantProcessId,
                },
              });

              if (formResponse) {
                // Use the same access logic as pending
                hasAccess = await this.userHasAccess(actor, {
                  reviewerId: form.reviewerId || '',
                  nextStepType: form.nextStepType,
                  nextStaffId: form.nextStaffId || '',
                  nextStepRoles: form.nextStepRoles,
                  formId: form.formId,
                  applicantProcessId: form.applicantProcessId,
                });
              }

              // If the user has access, check if the next form is completed
              if (hasAccess) {
                // Find the index of the current form in processForms
                const currentFormIndex = process.forms.findIndex(
                  pf => pf.formId === form.formId
                );

                // Check if there is a next form (index + 1)
                const nextFormIndex = currentFormIndex + 1;
                let isNextFormCompleted = false;

                if (nextFormIndex < process.forms.length) {
                  // Get the next form's formId from processForms
                  const nextForm = process.forms[nextFormIndex];
                  // Check if the next form is in APCompletedForms
                  const nextFormCompleted = ap.completedForms.find(cf => cf.formId === nextForm.formId);
                  isNextFormCompleted = !!nextFormCompleted;
                } else {
                  // If there is no next form (last form), consider it completed
                  isNextFormCompleted = true;
                }

                // Only include the form if the next form is completed
                if (isNextFormCompleted) {
                  visibleForms.push(form.formId);
                }
              }
            }
          } else {
            // If staffViewForms is true (YES), include all forms where user has access
            for (const form of ap.completedForms) {
              let hasAccess = false;

              // Get the form response to check access
              const formResponse = await this.prisma.formResponse.findFirst({
                where: {
                  formId: form.formId,
                  applicantProcessId: form.applicantProcessId,
                },
              });

              if (formResponse) {
                hasAccess = await this.userHasAccess(actor, {
                  reviewerId: form.reviewerId || '',
                  nextStepType: form.nextStepType,
                  nextStaffId: form.nextStaffId || '',
                  nextStepRoles: form.nextStepRoles,
                  formId: form.formId,
                  applicantProcessId: form.applicantProcessId,
                });
              }

              // If the user has access, check if the next form is completed
              if (hasAccess) {
                // Find the index of the current form in processForms
                const currentFormIndex = process.forms.findIndex(
                  pf => pf.formId === form.formId
                );

                // Check if there is a next form (index + 1)
                const nextFormIndex = currentFormIndex + 1;
                let isNextFormCompleted = false;

                if (nextFormIndex < process.forms.length) {
                  // Get the next form's formId from processForms
                  const nextForm = process.forms[nextFormIndex];
                  // Check if the next form is in APCompletedForms
                  const nextFormCompleted = ap.completedForms.find(cf => cf.formId === nextForm.formId);
                  isNextFormCompleted = !!nextFormCompleted;
                } else {
                  // If there is no next form (last form), consider it completed
                  isNextFormCompleted = true;
                }

                // Only include the form if the next form is completed
                if (isNextFormCompleted) {
                  visibleForms.push(form.formId);
                }
              }
            }
          }

          if (visibleForms.length > 0) {
            applicantProcessesForProcess.push({
              applicantProcessId: ap.id,
              applicantId: ap.applicantId,
              status: 'COMPLETED',
              completedForms: visibleForms,
              processLevel: `${ap.completedForms.length}/${process.forms.length}`,
            });
          }
        }
      }

      // Group results
      if (applicantProcessesForProcess.length > 0) {
        const groupIndex = groupedByGroup.findIndex(
          group => group.groupId.toString() === process.groupId.toString()
        );

        if (groupIndex !== -1) {
          groupedByGroup[groupIndex].processes.push({
            processId: process.id,
            name: process.name,
            applicantProcesses: applicantProcessesForProcess,
          });
        } else {
          groupedByGroup.push({
            groupName: process.group.name,
            groupId: process.group.id,
            processes: [{
              processId: process.id,
              name: process.name,
              applicantProcesses: applicantProcessesForProcess,
            }],
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_COMPLETED_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedByGroup.length },
    });

    return groupedByGroup;
  }

  async getCompletedFormsForProcess(
    processId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { forms: { orderBy: { order: 'asc' } } },
    });

    if (!process) {
      throw new NotFoundException('Process not found or disabled');
    }

    if (process.forms.length === 0) {
      return {
        process: {
          processId: process.id,
          name: process.name,
          groupId: process.groupId,
          status: process.status,
        },
        applicantProcesses: []
      };
    }

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id, status: ProcessStatus.ENABLED },
      include: {
        completedForms: { orderBy: { createdAt: 'asc' } },
        _count: { select: { completedForms: true } },
      },
    });

    const applicantProcessesForProcess: any[] = [];

    for (const ap of applicantProcesses) {
      if (ap._count.completedForms === process.forms.length) {
        let visibleForms: string[] = [];

        // Check staff view permission
        if (!process.staffViewForms) { // staffViewForms === false means NO
          visibleForms = [];
          for (const form of ap.completedForms) {
            let hasAccess = false;

            // Get the form response to check access
            const formResponse = await this.prisma.formResponse.findFirst({
              where: {
                formId: form.formId,
                applicantProcessId: form.applicantProcessId,
              },
            });

            if (formResponse) {
              hasAccess = await this.userHasAccess(actor, {
                reviewerId: form.reviewerId || '',
                nextStepType: form.nextStepType,
                nextStaffId: form.nextStaffId || '',
                nextStepRoles: form.nextStepRoles,
                formId: form.formId,
                applicantProcessId: form.applicantProcessId,
              });
            }

            // If the user has access, check if the next form is completed
            if (hasAccess) {
              // Find the index of the current form in processForms
              const currentFormIndex = process.forms.findIndex(
                pf => pf.formId === form.formId
              );

              // Check if there is a next form (index + 1)
              const nextFormIndex = currentFormIndex + 1;
              let isNextFormCompleted = false;

              if (nextFormIndex < process.forms.length) {
                // Get the next form's formId from processForms
                const nextForm = process.forms[nextFormIndex];
                // Check if the next form is in APCompletedForms
                const nextFormCompleted = ap.completedForms.find(cf => cf.formId === nextForm.formId);
                isNextFormCompleted = !!nextFormCompleted;
              } else {
                // If there is no next form (last form), consider it completed
                isNextFormCompleted = true;
              }

              // Only include the form if the next form is completed
              if (isNextFormCompleted) {
                visibleForms.push(form.formId);
              }
            }
          }
        } else {
          // If staffViewForms is true (YES), include all forms where user has access
          visibleForms = [];
          for (const form of ap.completedForms) {
            let hasAccess = false;

            // Get the form response to check access
            const formResponse = await this.prisma.formResponse.findFirst({
              where: {
                formId: form.formId,
                applicantProcessId: form.applicantProcessId,
              },
            });

            if (formResponse) {
              hasAccess = await this.userHasAccess(actor, {
                reviewerId: form.reviewerId || '',
                nextStepType: form.nextStepType,
                nextStaffId: form.nextStaffId || '',
                nextStepRoles: form.nextStepRoles,
                formId: form.formId,
                applicantProcessId: form.applicantProcessId,
              });
            }

            // If the user has access, check if the next form is completed
            if (hasAccess) {
              // Find the index of the current form in processForms
              const currentFormIndex = process.forms.findIndex(
                pf => pf.formId === form.formId
              );

              // Check if there is a next form (index + 1)
              const nextFormIndex = currentFormIndex + 1;
              let isNextFormCompleted = false;

              if (nextFormIndex < process.forms.length) {
                // Get the next form's formId from processForms
                const nextForm = process.forms[nextFormIndex];
                // Check if the next form is in APCompletedForms
                const nextFormCompleted = ap.completedForms.find(cf => cf.formId === nextForm.formId);
                isNextFormCompleted = !!nextFormCompleted;
              } else {
                // If there is no next form (last form), consider it completed
                isNextFormCompleted = true;
              }

              // Only include the form if the next form is completed
              if (isNextFormCompleted) {
                visibleForms.push(form.formId);
              }
            }
          }
        }

        if (visibleForms.length > 0) {
          applicantProcessesForProcess.push({
            applicantProcessId: ap.id,
            applicantId: ap.applicantId,
            status: 'COMPLETED',
            completedForms: visibleForms,
            processLevel: `${ap.completedForms.length}/${process.forms.length}`,
          });
        }
      }
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
      action: 'GET_COMPLETED_FORMS_FOR_PROCESS',
      resource: 'IncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: applicantProcessesForProcess.length },
    });

    return response;
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
        process: { include: { forms: { orderBy: { order: 'asc' } } } },
        completedForms: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!applicantProcess) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_COMPLETED_SINGLE_APPLICANT_PROCESS',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Applicant process not found.',
      });
      throw new NotFoundException('Applicant process not found.');
    }

    const totalFormsInProcess = applicantProcess.process.forms.length;

    if (applicantProcess.completedForms.length !== totalFormsInProcess) {
      await this.auditLogService.log({
        userId: actor.id,
        action: 'GET_COMPLETED_SINGLE_APPLICANT_PROCESS',
        resource: 'IncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Process not fully completed.',
      });
      throw new NotFoundException('Process not fully completed');
    }

    let visibleCompletedForms: string[] = [];

    // Check staff view permission
    if (!applicantProcess.process.staffViewForms) { // staffViewForms === false means NO
      visibleCompletedForms = [];
      for (const form of applicantProcess.completedForms) {
        let hasAccess = false;

        // Get the form response to check access
        const formResponse = await this.prisma.formResponse.findFirst({
          where: {
            formId: form.formId,
            applicantProcessId: form.applicantProcessId,
          },
        });

        if (formResponse) {
          hasAccess = await this.userHasAccess(actor, {
            reviewerId: form.reviewerId || '',
            nextStepType: form.nextStepType,
            nextStaffId: form.nextStaffId || '',
            nextStepRoles: form.nextStepRoles,
            formId: form.formId,
            applicantProcessId: form.applicantProcessId,
          });
        }

        // If the user has access, check if the next form is completed
        if (hasAccess) {
          // Find the index of the current form in processForms
          const currentFormIndex = applicantProcess.process.forms.findIndex(
            pf => pf.formId === form.formId
          );

          // Check if there is a next form (index + 1)
          const nextFormIndex = currentFormIndex + 1;
          let isNextFormCompleted = false;

          if (nextFormIndex < applicantProcess.process.forms.length) {
            // Get the next form's formId from processForms
            const nextForm = applicantProcess.process.forms[nextFormIndex];
            // Check if the next form is in APCompletedForms
            const nextFormCompleted = applicantProcess.completedForms.find(cf => cf.formId === nextForm.formId);
            isNextFormCompleted = !!nextFormCompleted;
          } else {
            // If there is no next form (last form), consider it completed
            isNextFormCompleted = true;
          }

          // Only include the form if the next form is completed
          if (isNextFormCompleted) {
            visibleCompletedForms.push(form.formId);
          }
        }
      }
    } else {
      // If staffViewForms is true (YES), include all forms where user has access
      visibleCompletedForms = [];
      for (const form of applicantProcess.completedForms) {
        let hasAccess = false;

        // Get the form response to check access
        const formResponse = await this.prisma.formResponse.findFirst({
          where: {
            formId: form.formId,
            applicantProcessId: form.applicantProcessId,
          },
        });

        if (formResponse) {
          hasAccess = await this.userHasAccess(actor, {
            reviewerId: form.reviewerId || '',
            nextStepType: form.nextStepType,
            nextStaffId: form.nextStaffId || '',
            nextStepRoles: form.nextStepRoles,
            formId: form.formId,
            applicantProcessId: form.applicantProcessId,
          });
        }

        // If the user has access, check if the next form is completed
        if (hasAccess) {
          // Find the index of the current form in processForms
          const currentFormIndex = applicantProcess.process.forms.findIndex(
            pf => pf.formId === form.formId
          );

          // Check if there is a next form (index + 1)
          const nextFormIndex = currentFormIndex + 1;
          let isNextFormCompleted = false;

          if (nextFormIndex < applicantProcess.process.forms.length) {
            // Get the next form's formId from processForms
            const nextForm = applicantProcess.process.forms[nextFormIndex];
            // Check if the next form is in APCompletedForms
            const nextFormCompleted = applicantProcess.completedForms.find(cf => cf.formId === nextForm.formId);
            isNextFormCompleted = !!nextFormCompleted;
          } else {
            // If there is no next form (last form), consider it completed
            isNextFormCompleted = true;
          }

          // Only include the form if the next form is completed
          if (isNextFormCompleted) {
            visibleCompletedForms.push(form.formId);
          }
        }
      }
    }

    const response = {
      process: {
        processId: applicantProcess.process.id,
        name: applicantProcess.process.name,
        groupId: applicantProcess.process.groupId,
        status: applicantProcess.process.status,
      },
      applicantProcess: {
        applicantProcessId: applicantProcess.id,
        applicantId: applicantProcess.applicantId,
        status: 'COMPLETED',
        completedForms: visibleCompletedForms,
        processLevel: `${visibleCompletedForms.length}/${totalFormsInProcess}`,
      }
    };

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_COMPLETED_SINGLE_APPLICANT_PROCESS',
      resource: 'IncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return response;
  }

  async getDisabledApplications(
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        forms: { orderBy: { order: 'asc' } },
        group: true
      },
    });

    const groupedDisabledApplications: any[] = [];

    for (const process of processes) {
      if (process.forms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.DISABLED },
        include: {
          completedForms: { orderBy: { createdAt: 'desc' } },
          _count: { select: { completedForms: true } },
        },
      });

      const applicantProcessesForProcess: any[] = [];

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
            formId: lastCompletedForm.formId,
            applicantProcessId: lastCompletedForm.applicantProcessId,
        });

        if (hasAccess) {
          const currentLevel = ap._count.completedForms;

          applicantProcessesForProcess.push({
            applicantProcessId: ap.id,
            applicantId: ap.applicantId,
            status: ap.status,
            completedForms: ap.completedForms.map(cf => cf.formId),
            pendingForm: {
              formId: process.forms[currentLevel]?.formId,
              nextStepType: lastCompletedForm?.nextStepType || "NOT_APPLICABLE",
              nextStepRoles: lastCompletedForm?.nextStepRoles || [],
              nextStepSpecifiedTo: lastCompletedForm?.nextStepSpecifiedTo
            },
            processLevel: `${currentLevel}/${process.forms.length}`,
          });
        }
      }

      if (applicantProcessesForProcess.length > 0) {
        // Grouping logic
        const groupIndex = groupedDisabledApplications.findIndex(
          group => group.groupId.toString() === process.groupId.toString()
        );

        if (groupIndex !== -1) {
          groupedDisabledApplications[groupIndex].processes.push({
            processId: process.id,
            name: process.name,
            applicantProcesses: applicantProcessesForProcess,
          });
        } else {
          groupedDisabledApplications.push({
            groupName: process.group.name,
            groupId: process.group.id,
            processes: [{
              processId: process.id,
              name: process.name,
              applicantProcesses: applicantProcessesForProcess,
            }],
          });
        }
      }
    }

    await this.auditLogService.log({
      userId: actor.id,
      action: 'GET_DISABLED_APPLICATIONS',
      resource: 'IncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedDisabledApplications.length },
    });

    return groupedDisabledApplications;
  }
}
