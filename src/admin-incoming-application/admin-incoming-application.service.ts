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

  async getAllPendingApplications(): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        group: true,
      },
    });

    const groupedPendingApplications: any[] = [];

    for (const process of processes) {
      const processForms = await this.prisma.processForm.findMany({
        where: { processId: process.id },
        orderBy: { createdAt: 'asc' },
        include: { form: true },
      });

      if (processForms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
      });

      const applicantProcessesForProcess: any[] = [];

      for (const applicantProcess of applicantProcesses) {
        const completedForms = await this.prisma.aPCompletedForm.findMany({
          where: { applicantProcessId: applicantProcess.id },
          orderBy: { createdAt: 'asc' },
        });

        const currentLevel = completedForms.length;

        // Skip if process is fully completed
        if (currentLevel >= processForms.length) continue;

        const nextForm = processForms[currentLevel];
        if (!nextForm) continue;

        // Get applicant details
        const applicant = await this.prisma.user.findUnique({
          where: { id: applicantProcess.applicantId },
        });
        if (!applicant) continue;

        // Get current reviewer info
        let currentReviewer: any = null;
        if (currentLevel > 0) {
          const lastCompletedForm = completedForms[currentLevel - 1];
          if (lastCompletedForm.nextStaffId) {
            currentReviewer = await this.prisma.user.findUnique({
              where: { id: lastCompletedForm.nextStaffId },
            });
          }
        }

        // Build complete form history with reviewers
        const formHistory: any[] = [];
        for (let i = 0; i < completedForms.length; i++) {
          const completedForm = completedForms[i];
          const form = await this.prisma.form.findUnique({
            where: { id: completedForm.formId },
          });

          let reviewer: any = null;
          if (completedForm.reviewerId) {
            reviewer = await this.prisma.user.findUnique({
              where: { id: completedForm.reviewerId },
            });
          }

          formHistory.push({
            formId: completedForm.formId,
            formName: form?.name || 'Unknown Form',
            completedAt: completedForm.createdAt,
            reviewer: reviewer ? {
              id: reviewer!.id,
              firstName: reviewer!.firstName || '',
              lastName: reviewer!.lastName || '',
              email: reviewer!.email,
            } : null,
            nextStepType: completedForm.nextStepType,
            nextStepRoles: completedForm.nextStepRoles,
          });
        }

        applicantProcessesForProcess.push({
          id: applicantProcess.id,
          applicant: {
            id: applicant.id,
            firstName: applicant.firstName || '',
            lastName: applicant.lastName || '',
            email: applicant.email,
          },
          currentLevel,
          totalForms: processForms.length,
          nextForm: {
            id: nextForm.formId,
            formName: nextForm.form?.name || 'Unknown Form',
          },
          currentReviewer: currentReviewer ? {
            id: currentReviewer!.id,
            firstName: currentReviewer!.firstName || '',
            lastName: currentReviewer!.lastName || '',
            email: currentReviewer!.email,
          } : null,
          formHistory,
          createdAt: applicantProcess.createdAt,
          status: 'PENDING',
        });
      }

      if (applicantProcessesForProcess.length > 0) {
        groupedPendingApplications.push({
          process: {
            id: process.id,
            name: process.name,
            type: process.type,
            group: process.groupId,
          },
          applications: applicantProcessesForProcess,
        });
      }
    }

    await this.auditLogService.log({
      action: 'GET_ALL_PENDING_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedPendingApplications.length },
    });

    return groupedPendingApplications;
  }

  async getAllCompletedApplications(): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        group: true,
      },
    });

    const groupedCompletedApplications: any[] = [];

    for (const process of processes) {
      const processForms = await this.prisma.processForm.findMany({
        where: { processId: process.id },
        orderBy: { createdAt: 'asc' },
        include: { form: true },
      });

      const totalFormsInProcess = processForms.length;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.ENABLED },
      });

      const applicantProcessesForProcess: any[] = [];

      for (const applicantProcess of applicantProcesses) {
        const completedForms = await this.prisma.aPCompletedForm.findMany({
          where: { applicantProcessId: applicantProcess.id },
          orderBy: { createdAt: 'asc' },
        });

        const currentLevel = completedForms.length;

        // Only include fully completed processes
        if (currentLevel !== totalFormsInProcess) continue;

        const applicant = await this.prisma.user.findUnique({
          where: { id: applicantProcess.applicantId },
        });
        if (!applicant) continue;

        // Build complete form history with all reviewers
        const formHistory: any[] = [];
        for (let i = 0; i < completedForms.length; i++) {
          const completedForm = completedForms[i];
          const form = await this.prisma.form.findUnique({
            where: { id: completedForm.formId },
          });

          let reviewer: any = null;
          if (completedForm.reviewerId) {
            reviewer = await this.prisma.user.findUnique({
              where: { id: completedForm.reviewerId },
            });
          }

          formHistory.push({
            formId: completedForm.formId,
            formName: form?.name || 'Unknown Form',
            completedAt: completedForm.createdAt,
            reviewer: reviewer ? {
              id: reviewer!.id,
              firstName: reviewer!.firstName || '',
              lastName: reviewer!.lastName || '',
              email: reviewer!.email,
            } : null,
            nextStepType: completedForm.nextStepType,
            nextStepRoles: completedForm.nextStepRoles,
          });
        }

        applicantProcessesForProcess.push({
          id: applicantProcess.id,
          applicant: {
            id: applicant.id,
            firstName: applicant.firstName || '',
            lastName: applicant.lastName || '',
            email: applicant.email,
          },
          currentLevel: totalFormsInProcess,
          totalForms: totalFormsInProcess,
          formHistory,
          completedAt: completedForms[completedForms.length - 1]?.createdAt,
          createdAt: applicantProcess.createdAt,
          status: 'COMPLETED',
        });
      }

      if (applicantProcessesForProcess.length > 0) {
        groupedCompletedApplications.push({
          process: {
            id: process.id,
            name: process.name,
            type: process.type,
            group: process.groupId,
          },
          applications: applicantProcessesForProcess,
        });
      }
    }

    await this.auditLogService.log({
      action: 'GET_ALL_COMPLETED_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedCompletedApplications.length },
    });

    return groupedCompletedApplications;
  }

  async getAllDisabledApplications(): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      where: { status: ProcessStatus.ENABLED },
      include: {
        group: true,
      },
    });

    const groupedDisabledApplications: any[] = [];

    for (const process of processes) {
      const processForms = await this.prisma.processForm.findMany({
        where: { processId: process.id },
        orderBy: { createdAt: 'asc' },
        include: { form: true },
      });

      if (processForms.length === 0) continue;

      const applicantProcesses = await this.prisma.applicantProcess.findMany({
        where: { processId: process.id, status: ProcessStatus.DISABLED },
      });

      const applicantProcessesForProcess: any[] = [];

      for (const applicantProcess of applicantProcesses) {
        const completedForms = await this.prisma.aPCompletedForm.findMany({
          where: { applicantProcessId: applicantProcess.id },
          orderBy: { createdAt: 'asc' },
        });

        const applicant = await this.prisma.user.findUnique({
          where: { id: applicantProcess.applicantId },
        });
        if (!applicant) continue;

        // Build form history
        const formHistory: any[] = [];
        for (let i = 0; i < completedForms.length; i++) {
          const completedForm = completedForms[i];
          const form = await this.prisma.form.findUnique({
            where: { id: completedForm.formId },
          });

          let reviewer: any = null;
          if (completedForm.reviewerId) {
            reviewer = await this.prisma.user.findUnique({
              where: { id: completedForm.reviewerId },
            });
          }

          formHistory.push({
            formId: completedForm.formId,
            formName: form?.name || 'Unknown Form',
            completedAt: completedForm.createdAt,
            reviewer: reviewer ? {
              id: reviewer!.id,
              firstName: reviewer!.firstName || '',
              lastName: reviewer!.lastName || '',
              email: reviewer!.email,
            } : null,
            nextStepType: completedForm.nextStepType,
            nextStepRoles: completedForm.nextStepRoles,
          });
        }

        applicantProcessesForProcess.push({
          id: applicantProcess.id,
          applicant: {
            id: applicant.id,
            firstName: applicant.firstName || '',
            lastName: applicant.lastName || '',
            email: applicant.email,
          },
          currentLevel: completedForms.length,
          totalForms: processForms.length,
          formHistory,
          createdAt: applicantProcess.createdAt,
          status: 'DISABLED',
        });
      }

      if (applicantProcessesForProcess.length > 0) {
        groupedDisabledApplications.push({
          process: {
            id: process.id,
            name: process.name,
            type: process.type,
            group: process.groupId,
          },
          applications: applicantProcessesForProcess,
        });
      }
    }

    await this.auditLogService.log({
      action: 'GET_ALL_DISABLED_APPLICATIONS_ADMIN',
      resource: 'AdminIncomingApplication',
      status: 'SUCCESS',
      details: { count: groupedDisabledApplications.length },
    });

    return groupedDisabledApplications;
  }

  async getSingleApplication(
    processId: string,
    applicantProcessId: string,
  ): Promise<any> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId, status: ProcessStatus.ENABLED },
      include: { group: true },
    });

    if (!process) {
      await this.auditLogService.log({
        action: 'GET_SINGLE_APPLICATION_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Process not found or disabled.',
      });
      throw new NotFoundException('Process not found or disabled.');
    }

    const processForms = await this.prisma.processForm.findMany({
      where: { processId: processId },
      orderBy: { createdAt: 'asc' },
      include: { form: true },
    });
    const totalFormsInProcess = processForms.length;

    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId, processId: processId },
    });

    if (!applicantProcess) {
      await this.auditLogService.log({
        action: 'GET_SINGLE_APPLICATION_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Applicant process not found.',
      });
      throw new NotFoundException('Applicant process not found.');
    }

    // Get applicant details
    const applicant = await this.prisma.user.findUnique({
      where: { id: applicantProcess.applicantId },
    });
    if (!applicant) {
      await this.auditLogService.log({
        action: 'GET_SINGLE_APPLICATION_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: applicantProcessId,
        status: 'FAILURE',
        errorMessage: 'Applicant not found.',
      });
      throw new NotFoundException('Applicant not found.');
    }

    const completedForms = await this.prisma.aPCompletedForm.findMany({
      where: { applicantProcessId: applicantProcess.id },
      orderBy: { createdAt: 'asc' },
    });

    const currentLevel = completedForms.length;

    // Build detailed form history with responses
    const detailedFormHistory: any[] = [];
    for (let i = 0; i < completedForms.length; i++) {
      const completedForm = completedForms[i];
      const form = await this.prisma.form.findUnique({
        where: { id: completedForm.formId },
      });
      const response = await this.prisma.formResponse.findFirst({
        where: {
          applicantProcessId: applicantProcess.id,
          formId: completedForm.formId,
        },
      });

      let reviewer: any = null;
      if (completedForm.reviewerId) {
        reviewer = await this.prisma.user.findUnique({
          where: { id: completedForm.reviewerId },
        });
      }

      detailedFormHistory.push({
        formId: completedForm.formId,
        formName: form?.name || 'Unknown Form',
        completedAt: completedForm.createdAt,
        reviewer: reviewer ? {
          id: reviewer!.id,
          firstName: reviewer!.firstName || '',
          lastName: reviewer!.lastName || '',
          email: reviewer!.email,
        } : null,
        responses: response?.responses || null,
        nextStepType: completedForm.nextStepType,
        nextStepRoles: completedForm.nextStepRoles,
        nextStaff: completedForm.nextStaffId,
        notificationType: completedForm.notificationType,
        notificationComment: completedForm.notificationComment,
      });
    }

    // Get next form if not completed
    let nextForm: any = null;
    if (currentLevel < totalFormsInProcess) {
      const nextFormConfig = processForms[currentLevel];
      const nextFormDetails = await this.prisma.form.findUnique({
        where: { id: nextFormConfig.formId },
      });
      nextForm = {
        id: nextFormConfig.formId,
        formName: nextFormDetails?.name || 'Unknown Form',
        config: nextFormConfig,
      };
    }

    const response = {
      process: {
        id: process.id,
        name: process.name,
        type: process.type,
        group: process.groupId,
      },
      application: {
        id: applicantProcess.id,
        applicant: {
          id: applicant.id,
          firstName: applicant.firstName || '',
          lastName: applicant.lastName || '',
          email: applicant.email,
        },
        status: applicantProcess.status,
        currentLevel,
        totalForms: totalFormsInProcess,
        createdAt: applicantProcess.createdAt,
        isCompleted: currentLevel >= totalFormsInProcess,
        progress: ((currentLevel / totalFormsInProcess) * 100).toFixed(1),
      },
      formHistory: detailedFormHistory,
      nextForm,
    };

    await this.auditLogService.log({
      action: 'GET_SINGLE_APPLICATION_ADMIN',
      resource: 'AdminIncomingApplication',
      resourceId: applicantProcessId,
      status: 'SUCCESS',
    });

    return response;
  }

  async getAllApplicationsForProcess(processId: string, status?: string): Promise<any> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId, status: ProcessStatus.ENABLED },
      include: { group: true },
    });

    if (!process) {
      await this.auditLogService.log({
        action: 'GET_ALL_APPLICATIONS_FOR_PROCESS_ADMIN',
        resource: 'AdminIncomingApplication',
        resourceId: processId,
        status: 'FAILURE',
        errorMessage: 'Process not found or disabled.',
      });
      throw new NotFoundException('Process not found or disabled.');
    }

    const processForms = await this.prisma.processForm.findMany({
      where: { processId: processId },
      orderBy: { createdAt: 'asc' },
      include: { form: true },
    });
    const totalFormsInProcess = processForms.length;

    // Build query for applicant processes
    const query: any = { processId: processId };
    if (status && ['ENABLED', 'DISABLED'].includes(status)) {
      query.status = status;
    }

    const applicantProcesses = await this.prisma.applicantProcess.findMany({
      where: query,
    });

    const applications: any[] = [];

    for (const applicantProcess of applicantProcesses) {
      const completedForms = await this.prisma.aPCompletedForm.findMany({
        where: { applicantProcessId: applicantProcess.id },
        orderBy: { createdAt: 'asc' },
      });

      const currentLevel = completedForms.length;

      const applicant = await this.prisma.user.findUnique({
        where: { id: applicantProcess.applicantId },
      });
      if (!applicant) continue;

      // Determine application status
      let appStatus = 'PENDING';
      if (applicantProcess.status === 'DISABLED') {
        appStatus = 'DISABLED';
      } else if (currentLevel >= totalFormsInProcess) {
        appStatus = 'COMPLETED';
      }

      // Build form history
      const formHistory: any[] = [];
      for (let i = 0; i < completedForms.length; i++) {
        const completedForm = completedForms[i];
        const form = await this.prisma.form.findUnique({
          where: { id: completedForm.formId },
        });

        let reviewer: any = null;
        if (completedForm.reviewerId) {
          reviewer = await this.prisma.user.findUnique({
            where: { id: completedForm.reviewerId },
          });
        }

        formHistory.push({
          formId: completedForm.formId,
          formName: form?.name || 'Unknown Form',
          completedAt: completedForm.createdAt,
          reviewer: reviewer ? {
            id: reviewer!.id,
            firstName: reviewer!.firstName || '',
            lastName: reviewer!.lastName || '',
            email: reviewer!.email,
          } : null,
        });
      }

      applications.push({
        id: applicantProcess.id,
        applicant: {
          id: applicant.id,
          firstName: applicant.firstName || '',
          lastName: applicant.lastName || '',
          email: applicant.email,
        },
        status: appStatus,
        currentLevel,
        totalForms: totalFormsInProcess,
        progress: ((currentLevel / totalFormsInProcess) * 100).toFixed(1),
        formHistory,
        createdAt: applicantProcess.createdAt,
      });
    }

    await this.auditLogService.log({
      action: 'GET_ALL_APPLICATIONS_FOR_PROCESS_ADMIN',
      resource: 'AdminIncomingApplication',
      resourceId: processId,
      status: 'SUCCESS',
      details: { count: applications.length },
    });

    return {
      process: {
        id: process.id,
        name: process.name,
        type: process.type,
        group: process.groupId,
      },
      applications: applications.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  }
}
