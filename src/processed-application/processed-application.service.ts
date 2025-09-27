import { Injectable, NotFoundException } from '@nestjs/common';
import { NextStepType, ProcessForm, UserStatus } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { CreateProcessedApplicationDto } from './dto/create-processed-application.dto';

@Injectable()
export class ProcessedApplicationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

  async create(data: CreateProcessedApplicationDto) {
    const { applicantProcessId, formId, reviewerId, responses } = data;

    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
      include: { process: { include: { forms: true } }, applicant: true },
    });

    if (!applicantProcess) {
      throw new NotFoundException('Applicant process not found.');
    }

    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
    });
    if (!reviewer) {
      throw new NotFoundException('Reviewer not found.');
    }

    // 1. Save the form response
    await this.prisma.formResponse.upsert({
      where: { formId_applicantProcessId: { formId, applicantProcessId } },
      update: { responses },
      create: {
        formId,
        processId: applicantProcess.processId,
        applicantProcessId,
        responses,
      },
    });

    // 2. Mark the form as completed with workflow information
    const processForm = await this.prisma.processForm.findFirst({
      where: { processId: applicantProcess.processId, formId },
    });

    if (!processForm) {
      throw new NotFoundException('Process form not found');
    }

    // Determine next staff based on nextStepType
    let nextStaffId: string | null = null;
    if (processForm.nextStepType === 'STATIC') {
      nextStaffId = processForm.nextStaffId;
    }

    await this.prisma.aPCompletedForm.create({
      data: {
        applicantProcessId,
        formId,
        reviewerId,
        nextStaffId,
        nextStepType: processForm.nextStepType,
        nextStepRoles: processForm.nextStepRoles,
        nextStepSpecifiedTo: processForm.nextStepSpecifiedTo,
        notificationType: processForm.notificationType,
        notificationToId: processForm.notificationToId,
        notificationToRoles: processForm.notificationRoles,
        notificationComment: processForm.notificationComment,
        notifyApplicant: processForm.notifyApplicant,
        applicantNotificationContent: processForm.applicantNotificationContent,
        editApplicationStatus: processForm.editApplicationStatus,
        applicantViewFormAfterCompletion:
          processForm.applicantViewFormAfterCompletion,
      },
    });

    // 3. Create processed application record for tracking
    await this.prisma.processedApplication.create({
      data: {
        userId: reviewerId,
        processId: applicantProcess.processId,
        applicantProcessId,
        formId,
        formRoleIds: [], // Will be populated based on user roles
      },
    });

    // 4. Send immediate email to next staff if STATIC
    if (processForm.nextStepType === 'STATIC' && nextStaffId) {
      const nextStaff = await this.prisma.user.findUnique({
        where: { id: nextStaffId },
      });
      if (nextStaff) {
        await this.emailService.sendEmail(
          nextStaff.email,
          'You have an incoming pending application for review.',
        );
      }
    }

    // 5. Send notifications based on process form configuration
    await this.sendNotifications(processForm, applicantProcess, reviewer);

    // 6. Send email notifications
    await this.sendEmailNotifications(processForm, applicantProcess, reviewer);

    await this.auditLogService.log({
      userId: reviewerId,
      action: 'APPLICATION_PROCESSED',
      resource: 'ProcessedApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
      details: { formId },
    });

    return { message: 'Application step processed successfully.' };
  }

  async update(id: string, data: Partial<CreateProcessedApplicationDto>) {
    const existing = await this.prisma.processedApplication.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Processed application not found');
    }

    const updated = await this.prisma.processedApplication.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      userId: data.reviewerId || existing.userId,
      action: 'PROCESSED_APPLICATION_UPDATED',
      resource: 'ProcessedApplication',
      resourceId: id,
      status: 'SUCCESS',
    });

    return updated;
  }

  async getProcessedApplicationsByUser(userId: string) {
    // Get user's roles for access control
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, status: 'ENABLED' },
      select: { roleId: true },
    });
    const roleIds = userRoles.map((role) => role.roleId);

    // Get enabled processes
    const processes = await this.prisma.process.findMany({
      where: { status: 'ENABLED' },
      include: { group: true },
    });

    const groupedApplications: any[] = [];

    for (const process of processes) {
      const processForms = await this.prisma.processForm.findMany({
        where: { processId: process.id },
        orderBy: { order: 'asc' },
      });

      if (processForms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id },
      });

      const applicationsForProcess: any[] = [];

      for (const applicantProcess of applicantProcesses) {
        const completedForms = await this.prisma.aPCompletedForm.findMany({
          where: { applicantProcessId: applicantProcess.id },
          orderBy: { createdAt: 'asc' },
        });

        if (completedForms.length >= processForms.length) continue;

        const nextForm = processForms[completedForms.length];
        if (!nextForm) continue;

        // Check access control - get workflow info from ProcessForm for the last completed form
        let hasAccess = false;
        if (completedForms.length === 0) {
          // First form - everyone can access
          hasAccess = true;
        } else {
          const lastCompletedForm = completedForms[completedForms.length - 1];
          const lastProcessForm = await this.prisma.processForm.findFirst({
            where: { processId: process.id, formId: lastCompletedForm.formId },
          });

          if (lastProcessForm) {
            hasAccess = await this.checkUserAccessToForm(
              userId,
              roleIds,
              {
                nextStepType: lastProcessForm.nextStepType,
                nextStaffId: lastProcessForm.nextStaffId,
                nextStepRoles: lastProcessForm.nextStepRoles,
                reviewerId: lastCompletedForm.reviewerId || '',
              },
              applicantProcess.applicantId,
            );
          }
        }

        if (hasAccess) {
          applicationsForProcess.push({
            applicantProcessId: applicantProcess.id,
            applicantId: applicantProcess.applicantId,
            status: applicantProcess.status,
            completedForms: completedForms.map((cf) => cf.formId),
            pendingForm: {
              formId: nextForm.formId,
              nextStepType: nextForm.nextStepType,
              nextStepRoles: nextForm.nextStepRoles,
            },
            processLevel: `${completedForms.length}/${processForms.length}`,
          });
        }
      }

      if (applicationsForProcess.length > 0) {
        groupedApplications.push({
          processId: process.id,
          name: process.name,
          applications: applicationsForProcess,
        });
      }
    }

    return groupedApplications;
  }

  async getProcessedApplicationsByUserAndProcess(
    userId: string,
    processId: string,
  ) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, status: 'ENABLED' },
      select: { roleId: true },
    });
    const roleIds = userRoles.map((role) => role.roleId);

    const process = await this.prisma.process.findUnique({
      where: { id: processId, status: 'ENABLED' },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    const processForms = await this.prisma.processForm.findMany({
      where: { processId },
      orderBy: { order: 'asc' },
    });

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId },
    });

    const applicationsForProcess: any[] = [];

    for (const applicantProcess of applicantProcesses) {
      const completedForms = await this.prisma.aPCompletedForm.findMany({
        where: { applicantProcessId: applicantProcess.id },
        orderBy: { createdAt: 'asc' },
      });

      if (completedForms.length >= processForms.length) continue;

      const nextForm = processForms[completedForms.length];
      if (!nextForm) continue;

      const hasAccess = await this.checkUserAccessToForm(
        userId,
        roleIds,
        {
          nextStepType: nextForm.nextStepType,
          nextStaffId: nextForm.nextStaffId,
          nextStepRoles: nextForm.nextStepRoles,
          reviewerId:
            completedForms.length > 0
              ? completedForms[completedForms.length - 1].reviewerId || ''
              : '',
        },
        applicantProcess.applicantId,
      );

      if (hasAccess) {
        applicationsForProcess.push({
          applicantProcessId: applicantProcess.id,
          applicantId: applicantProcess.applicantId,
          status: applicantProcess.status,
          completedForms: completedForms.map((cf) => cf.formId),
          pendingForm: {
            formId: nextForm.formId,
            nextStepType: nextForm.nextStepType,
            nextStepRoles: nextForm.nextStepRoles,
          },
          processLevel: `${completedForms.length}/${processForms.length}`,
        });
      }
    }

    return {
      process: {
        processId: process.id,
        name: process.name,
        groupId: process.groupId,
        status: process.status,
      },
      applicantProcesses: applicationsForProcess,
    };
  }

  async getSingleProcessedApplication(
    userId: string,
    processId: string,
    applicantProcessId: string,
  ) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, status: 'ENABLED' },
      select: { roleId: true },
    });
    const roleIds = userRoles.map((role) => role.roleId);

    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId, processId },
    });

    if (!applicantProcess) {
      throw new NotFoundException('Applicant process not found');
    }

    const processForms = await this.prisma.processForm.findMany({
      where: { processId },
      orderBy: { order: 'asc' },
    });

    const completedForms = await this.prisma.aPCompletedForm.findMany({
      where: { applicantProcessId },
      orderBy: { createdAt: 'asc' },
    });

    const currentLevel = completedForms.length;
    const nextForm = processForms[currentLevel];

    // Check access
    if (currentLevel > 0) {
      const lastCompletedForm = completedForms[currentLevel - 1];
      const hasAccess = await this.checkUserAccessToForm(
        userId,
        roleIds,
        {
          nextStepType: nextForm.nextStepType,
          nextStaffId: nextForm.nextStaffId,
          nextStepRoles: nextForm.nextStepRoles,
          reviewerId: lastCompletedForm.reviewerId || '',
        },
        applicantProcess.applicantId,
      );

      if (!hasAccess) {
        throw new NotFoundException('Access denied');
      }
    }

    return {
      applicantProcess: {
        applicantProcessId: applicantProcess.id,
        applicantId: applicantProcess.applicantId,
        status: applicantProcess.status,
        completedForms: completedForms.map((cf) => cf.formId),
        processLevel: `${currentLevel}/${processForms.length}`,
        lastCompletedForm: completedForms[completedForms.length - 1],
        nextPendingForm: nextForm ? { formId: nextForm.formId } : null,
      },
    };
  }

  private async checkUserAccessToForm(
    userId: string,
    roleIds: string[],
    lastCompletedFormInfo: {
      nextStepType: NextStepType;
      nextStaffId: string | null;
      nextStepRoles: string[];
      nextStepSpecifiedTo?: string;
      reviewerId: string;
    },
    applicantId: string,
  ): Promise<boolean> {
    switch (lastCompletedFormInfo.nextStepType) {
      case 'STATIC':
        return lastCompletedFormInfo.nextStaffId === userId;

      case 'DYNAMIC':
        if (lastCompletedFormInfo.nextStepSpecifiedTo === 'ALL_STAFF') {
          return (
            lastCompletedFormInfo.nextStepRoles?.some((roleId: string) =>
              roleIds.includes(roleId),
            ) ?? false
          );
        } else {
          return lastCompletedFormInfo.nextStaffId === userId;
        }

      case 'FOLLOW_ORGANIZATION_CHART':
        const applicantOrg = await this.prisma.organizationUser.findUnique({
          where: { userId: applicantId },
        });
        const supervisorOrg = await this.prisma.organizationUser.findUnique({
          where: { userId },
        });
        return applicantOrg?.superiorId === supervisorOrg?.id;

      case 'NOT_APPLICABLE':
      default:
        return true;
    }
  }

  private async sendNotifications(
    processForm: ProcessForm,
    applicantProcess: {
      id: string;
      applicantId: string;
      processId: string;
      status: string;
      createdAt: Date;
      applicant: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        password: string;
        photo: string | null;
        googleId: string | null;
        status: UserStatus;
        createdAt: Date;
        updatedAt: Date;
      };
    },
    reviewer: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      password: string;
      photo: string | null;
      googleId: string | null;
      status: UserStatus;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<void> {
    // Send notifications using the notification service
    if (this.notificationService) {
      await this.notificationService.sendNotification(
        processForm,
        applicantProcess.applicant,
        reviewer,
      );
    }
  }

  private async sendEmailNotifications(
    processForm: ProcessForm,
    applicantProcess: {
      id: string;
      applicantId: string;
      processId: string;
      status: string;
      createdAt: Date;
      applicant: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        password: string;
        photo: string | null;
        googleId: string | null;
        status: UserStatus;
        createdAt: Date;
        updatedAt: Date;
      };
    },
    reviewer: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      password: string;
      photo: string | null;
      googleId: string | null;
      status: UserStatus;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<void> {
    const notificationType = processForm.notificationType;
    const notificationComment =
      processForm.notificationComment ||
      'You have a new application to review.';

    try {
      switch (notificationType) {
        case NextStepType.STATIC:
          if (processForm.notificationToId) {
            const notificationUser = await this.prisma.user.findUnique({
              where: { id: processForm.notificationToId },
            });
            if (notificationUser) {
              await this.emailService.sendEmail(
                notificationUser.email,
                `Application Notification: ${notificationComment}`,
              );
            }
          }
          break;

        case NextStepType.DYNAMIC:
          if (processForm.notificationRoles?.length) {
            const userRoles = await this.prisma.userRole.findMany({
              where: {
                roleId: { in: processForm.notificationRoles },
                status: 'ENABLED',
              },
              include: { user: true },
            });

            for (const userRole of userRoles) {
              if (userRole.user) {
                await this.emailService.sendEmail(
                  userRole.user.email,
                  `Application Notification: ${notificationComment}`,
                );
              }
            }
          }
          break;

        case NextStepType.FOLLOW_ORGANIZATION_CHART:
          const reviewerOrg = await this.prisma.organizationUser.findFirst({
            where: { userId: reviewer.id },
          });

          if (reviewerOrg?.superiorId) {
            const superior = await this.prisma.user.findUnique({
              where: { id: reviewerOrg.superiorId },
            });

            if (superior) {
              await this.emailService.sendEmail(
                superior.email,
                `Application Notification: ${notificationComment}`,
              );
            }
          }
          break;

        case NextStepType.NOT_APPLICABLE:
        default:
          // No notification needed
          break;
      }
    } catch (error) {
      // Log error but don't fail the process
      console.error('Error sending email notifications:', error);
    }
  }
}
