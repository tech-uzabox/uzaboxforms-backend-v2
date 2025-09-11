import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicantProcess, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateApplicantProcessDto } from './dto/create-applicant-process.dto';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ApplicantProcessService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private notificationService: NotificationService,
  ) {}

  async create(data: CreateApplicantProcessDto): Promise<ApplicantProcess> {
    const { applicantId, processId, formId, responses } = data;

    const applicant = await this.prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
        throw new NotFoundException('Applicant not found.');
    }

    const newApplicantProcess = await this.prisma.applicantProcess.create({
      data: {
        applicant: { connect: { id: applicantId } },
        process: { connect: { id: processId } },
      },
    });

    await this.prisma.formResponse.create({
      data: {
        form: { connect: { id: formId } },
        process: { connect: { id: processId } },
        applicantProcess: { connect: { id: newApplicantProcess.id } },
        responses,
      },
    });

    const processForm = await this.prisma.processForm.findFirst({
        where: { processId, formId }
    });

    if (!processForm) {
        throw new NotFoundException('Process form configuration not found.');
    }

    await this.prisma.aPCompletedForm.create({
        data: {
            applicantProcessId: newApplicantProcess.id,
            formId: formId,
            reviewerId: applicantId, // The applicant is the first reviewer
        }
    });

    await this.notificationService.sendNotification(processForm, applicant, applicant);

    await this.auditLogService.log({
      userId: newApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_CREATED',
      resource: 'ApplicantProcess',
      resourceId: newApplicantProcess.id,
      status: 'SUCCESS',
      details: { processId: newApplicantProcess.processId },
    });
    return newApplicantProcess;
  }

  async findAll(): Promise<ApplicantProcess[]> {
    return this.prisma.applicantProcess.findMany();
  }

  async findOne(id: string): Promise<ApplicantProcess | null> {
    return this.prisma.applicantProcess.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.ApplicantProcessUpdateInput,
  ): Promise<ApplicantProcess> {
    const updatedApplicantProcess = await this.prisma.applicantProcess.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_UPDATED',
      resource: 'ApplicantProcess',
      resourceId: updatedApplicantProcess.id,
      status: 'SUCCESS',
      details: { changes: data },
    });
    return updatedApplicantProcess;
  }

  async remove(id: string): Promise<ApplicantProcess> {
    const deletedApplicantProcess = await this.prisma.applicantProcess.delete({
      where: { id },
    });
    await this.auditLogService.log({
      userId: deletedApplicantProcess.applicantId,
      action: 'APPLICANT_PROCESS_DELETED',
      resource: 'ApplicantProcess',
      resourceId: deletedApplicantProcess.id,
      status: 'SUCCESS',
      details: { processId: deletedApplicantProcess.processId },
    });
    return deletedApplicantProcess;
  }

  async findByUserId(userId: string): Promise<ApplicantProcess[]> {
    return this.prisma.applicantProcess.findMany({
      where: { applicantId: userId },
    });
  }
}
