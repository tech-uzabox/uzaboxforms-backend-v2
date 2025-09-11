import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ProcessSendbackService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async sendback(applicantProcessId: string): Promise<{ message: string }> {
    // Find the most recently completed form for this applicant process
    const lastCompletedForm = await this.prisma.aPCompletedForm.findFirst({
      where: { applicantProcessId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastCompletedForm) {
      throw new NotFoundException(
        'No completed forms found for this applicant process.',
      );
    }

    // Delete the corresponding form response
    await this.prisma.formResponse.delete({
      where: {
        formId_applicantProcessId: {
          formId: lastCompletedForm.formId,
          applicantProcessId: lastCompletedForm.applicantProcessId,
        },
      },
    });

    // Delete the completed form record
    await this.prisma.aPCompletedForm.delete({
      where: { id: lastCompletedForm.id },
    });

    await this.auditLogService.log({
      action: 'PROCESS_SENDBACK',
      resource: 'ApplicantProcess',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
      details: { formId: lastCompletedForm.formId },
    });

    return { message: 'Last step sent back successfully.' };
  }
}
