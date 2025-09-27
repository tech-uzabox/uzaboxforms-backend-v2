import { Injectable } from '@nestjs/common';
import { NextStepType, ProcessForm, User } from 'db/client';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async sendNotification(
    processForm: ProcessForm,
    applicant: User,
    reviewer?: User,
  ) {
    const {
      notificationType,
      notificationRoles,
      notificationToId,
      notificationComment,
      notifyApplicant,
      applicantNotificationContent,
    } = processForm;

    if (notifyApplicant && applicantNotificationContent) {
      await this.emailService.sendEmail(
        applicant.email,
        applicantNotificationContent,
      );
    }

    let recipients: User[] = [];

    switch (notificationType) {
      case NextStepType.STATIC:
        if (notificationToId) {
          const user = await this.prisma.user.findUnique({
            where: { id: notificationToId },
          });
          if (user) recipients.push(user);
        }
        break;
      case NextStepType.DYNAMIC:
        if (notificationRoles && notificationRoles.length > 0) {
          const users = await this.prisma.user.findMany({
            where: {
              roles: { some: { role: { name: { in: notificationRoles } } } },
            },
          });
          recipients.push(...users);
        }
        break;
      case NextStepType.FOLLOW_ORGANIZATION_CHART:
        if (reviewer) {
          const reviewerOrgUser = await this.prisma.organizationUser.findFirst({
            where: { userId: reviewer.id },
          });
          if (reviewerOrgUser && reviewerOrgUser.superiorId) {
            const superior = await this.prisma.user.findUnique({
              where: { id: reviewerOrgUser.superiorId },
            });
            if (superior) recipients.push(superior);
          }
        }
        break;
    }

    for (const recipient of recipients) {
      await this.emailService.sendEmail(
        recipient.email,
        notificationComment || 'New application requires your attention.',
      );
    }
  }
}
