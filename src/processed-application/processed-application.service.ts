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
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        isLocked: boolean;
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
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      isLocked: boolean;
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
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        isLocked: boolean;
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
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      isLocked: boolean;
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
