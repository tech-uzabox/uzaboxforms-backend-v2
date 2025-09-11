import { Injectable, NotFoundException } from '@nestjs/common';
import { ProcessStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ApplicationDto } from './dto/application.dto';

@Injectable()
export class AdminIncomingApplicationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async getAllPendingApplications(): Promise<ApplicationDto[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: { 
        group: true,
        _count: {
          select: { forms: true }
        }
      },
    });

    const pendingApplications: ApplicationDto[] = [];

    for (const process of processes) {
      if (process._count.forms === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: { applicant: true, _count: { select: { completedForms: true } } },
      });

      for (const ap of applicantProcesses) {
        if (ap._count.completedForms < process._count.forms) {
          pendingApplications.push({
            id: ap.id,
            applicantId: ap.applicantId,
            applicantEmail: ap.applicant.email,
            processId: process.id,
            processName: process.name,
            groupName: process.group.name,
            status: 'Pending',
            createdAt: ap.createdAt,
            completedFormsCount: ap._count.completedForms,
            totalFormsCount: process._count.forms,
          });
        }
      }
    }
    await this.auditLogService.log({
      action: 'GET_ALL_PENDING_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: pendingApplications.length },
    });
    return pendingApplications;
  }

  async getAllCompletedApplications(): Promise<ApplicationDto[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: { 
        group: true,
        _count: {
          select: { forms: true }
        }
      },
    });

    const completedApplications: ApplicationDto[] = [];

    for (const process of processes) {
      if (process._count.forms === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
        include: { applicant: true, _count: { select: { completedForms: true } } },
      });

      for (const ap of applicantProcesses) {
        if (ap._count.completedForms === process._count.forms) {
          completedApplications.push({
            id: ap.id,
            applicantId: ap.applicantId,
            applicantEmail: ap.applicant.email,
            processId: process.id,
            processName: process.name,
            groupName: process.group.name,
            status: 'Completed',
            createdAt: ap.createdAt,
            completedFormsCount: ap._count.completedForms,
            totalFormsCount: process._count.forms,
          });
        }
      }
    }
    await this.auditLogService.log({
      action: 'GET_ALL_COMPLETED_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: completedApplications.length },
    });
    return completedApplications;
  }

  async getAllDisabledApplications(): Promise<ApplicationDto[]> {
    const disabledProcesses = await this.prisma.applicantProcess.findMany({
      where: { status: ProcessStatus.DISABLED },
      include: {
        applicant: true,
        process: {
          include: {
            group: true,
          }
        }
      }
    });

    const disabledApplications = disabledProcesses.map(ap => ({
      id: ap.id,
      applicantId: ap.applicantId,
      applicantEmail: ap.applicant.email,
      processId: ap.process.id,
      processName: ap.process.name,
      groupName: ap.process.group.name,
      status: 'Disabled',
      createdAt: ap.createdAt,
    }));

    await this.auditLogService.log({
      action: 'GET_ALL_DISABLED_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: disabledApplications.length },
    });
    return disabledApplications;
  }

  async getSingleApplication(
    processId: string,
    applicantProcessId: string,
  ): Promise<any> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId, processId: processId },
      include: {
        applicant: true,
        process: {
          include: {
            _count: {
              select: { forms: true }
            }
          }
        },
        completedForms: true,
        responses: true,
      },
    });

    if (!applicantProcess) {
      await this.auditLogService.log({
        action: 'GET_SINGLE_APPLICATION_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Application not found.',
      });
      throw new NotFoundException('Application not found.');
    }

    await this.auditLogService.log({
      action: 'GET_SINGLE_APPLICATION_ADMIN',
      resource: 'AdminIncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    const { process, ...rest } = applicantProcess;
    return {
      ...rest,
      process: {
        ...process,
        totalFormsCount: process._count.forms
      }
    };
  }

  async getAllApplicationsForProcess(processId: string): Promise<any[]> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { 
        group: true,
        _count: { select: { forms: true } }
      },
    });

    if (!process) {
      await this.auditLogService.log({
        action: 'GET_ALL_APPLICATIONS_FOR_PROCESS_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: processId,
        status: 'FAILURE',
        errorMessage: 'Process not found.',
      });
      throw new NotFoundException('Process not found.');
    }

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: { processId: process.id },
      include: { applicant: true, _count: { select: { completedForms: true } } },
    });

    await this.auditLogService.log({
      action: 'GET_ALL_APPLICATIONS_FOR_PROCESS_ADMIN',
      resource: 'AdminIncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: applicantProcesses.length },
    });

    return applicantProcesses.map((ap) => ({
      id: ap.id,
      applicantId: ap.applicantId,
      applicantEmail: ap.applicant.email,
      status: ap.status,
      createdAt: ap.createdAt,
      completedFormsCount: ap._count.completedForms,
      totalFormsCount: process._count.forms,
    }));
  }
}
