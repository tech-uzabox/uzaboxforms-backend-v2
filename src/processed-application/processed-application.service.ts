import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../email/email.service';
import { CreateProcessedApplicationDto } from './dto/create-processed-application.dto';
import { NotificationService } from '../notification/notification.service';

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
        include: { process: { include: { forms: true } }, applicant: true }
    });

    if (!applicantProcess) {
        throw new NotFoundException('Applicant process not found.');
    }

    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId } });
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
        }
    });

    // 2. Mark the form as completed
    await this.prisma.aPCompletedForm.create({
        data: {
            applicantProcessId,
            formId,
            reviewerId,
        }
    });

    const processForm = await this.prisma.processForm.findFirst({
        where: { processId: applicantProcess.processId, formId }
    });

    if (processForm) {
        await this.notificationService.sendNotification(processForm, applicantProcess.applicant, reviewer);
    }

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
}