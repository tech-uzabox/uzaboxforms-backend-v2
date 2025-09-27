import { Injectable, NotFoundException } from '@nestjs/common';
import { NextStepType, Process, Role } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';

// Extended Process type that includes roles
export interface ProcessWithRoles extends Omit<Process, 'roles'> {
  roles: Role[];
}

@Injectable()
export class ProcessService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateProcessDto): Promise<Process> {
    const {
      name,
      type,
      groupId,
      creatorId,
      status,
      archived,
      staffViewForms,
      applicantViewProcessLevel,
      roles,
    } = data;

    // Validate roles exist if provided
    if (roles && roles.length > 0) {
      const existingRoles = await this.prisma.role.findMany({
        where: { id: { in: roles } },
        select: { id: true },
      });
      const existingRoleIds = existingRoles.map((r) => r.id);
      const invalidRoleIds = roles.filter(
        (id) => !existingRoleIds.includes(id),
      );
      if (invalidRoleIds.length > 0) {
        throw new Error(
          `Role(s) with ID(s) ${invalidRoleIds.join(', ')} not found`,
        );
      }
    }

    const newProcess = await this.prisma.process.create({
      data: {
        name,
        type,
        group: { connect: { id: groupId } },
        creator: { connect: { id: creatorId } },
        status,
        archived,
        staffViewForms,
        applicantViewProcessLevel,
        roles:
          roles && roles.length > 0
            ? {
                create: roles.map((roleId) => ({
                  roleId,
                  status: 'ENABLED',
                })),
              }
            : undefined,
      },
      include: {
        creator: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.auditLogService.log({
      userId: newProcess.creatorId,
      action: 'PROCESS_CREATED',
      resource: 'Process',
      resourceId: newProcess.id,
      status: 'SUCCESS',
      details: { name: newProcess.name, type: newProcess.type, roles },
    });
    return newProcess;
  }

  async findAll(): Promise<{ success: boolean; data: any[] }> {
    const processes = await this.prisma.process.findMany({
      include: {
        group: true,
        creator: true,
        roles: {
          select: {
            role: true,
          },
        },
        forms: {
          include: {
            form: true,
          },
        },
      },
    });

    // Format to match old API response
    const formattedProcesses = await Promise.all(
      processes.map(async (process) => {
        const processForms = process.forms || [];

        const forms = processForms.map((pf) => {
          const form = pf.form;
          if (!form) return null;

          return {
            name: form.name,
            status: form.status,
            createdAt: form.createdAt?.toISOString(),
            updatedAt: form.updatedAt?.toISOString(),
            nextStepType: pf.nextStepType,
            nextStepRoles: pf.nextStepRoles,
            nextStepSpecifiedTo: pf.nextStepSpecifiedTo,
            nextStaff: pf.nextStaffId, // Changed from nextStaff to nextStaffId
            notificationType: pf.notificationType,
            notificationTo: pf.notificationToId, // Changed from notificationTo to notificationToId
            notificationToRoles: pf.notificationRoles, // Changed from notificationToRoles to notificationRoles
            notificationComment: pf.notificationComment,
            notifyApplicant: pf.notifyApplicant,
            applicantNotificationContent: pf.applicantNotificationContent,
            editApplicationStatus: pf.editApplicationStatus,
            applicantViewFormAfterCompletion:
              pf.applicantViewFormAfterCompletion,
          };
        });

        return {
          ...process,
          processName: process.name,
          processStatus: process.status,
          updatedAt: process.updatedAt?.toISOString(),
          processForms: forms.filter((form) => form !== null),
        };
      }),
    );

    return {
      success: true,
      data: formattedProcesses,
    };
  }

  async findByFormId(
    formId: string,
  ): Promise<{ success: boolean; data: any[] }> {
    const processes = await this.prisma.process.findMany({
      where: {
        forms: {
          some: {
            formId: formId,
          },
        },
      },
      include: {
        group: true,
        creator: true,
        roles: {
          select: {
            role: true,
          },
        },
        forms: {
          include: {
            form: true,
          },
        },
      },
    });

    // Format to match old API response
    const formattedProcesses = await Promise.all(
      processes.map(async (process) => {
        const processForms = process.forms || [];

        const forms = processForms.map((pf) => {
          const form = pf.form;
          if (!form) return null;

          return {
            name: form.name,
            status: form.status,
            createdAt: form.createdAt?.toISOString(),
            updatedAt: form.updatedAt?.toISOString(),
            nextStepType: pf.nextStepType,
            nextStepRoles: pf.nextStepRoles,
            nextStepSpecifiedTo: pf.nextStepSpecifiedTo,
            nextStaff: pf.nextStaffId, // Changed from nextStaff to nextStaffId
            notificationType: pf.notificationType,
            notificationTo: pf.notificationToId, // Changed from notificationTo to notificationToId
            notificationToRoles: pf.notificationRoles, // Changed from notificationToRoles to notificationRoles
            notificationComment: pf.notificationComment,
            notifyApplicant: pf.notifyApplicant,
            applicantNotificationContent: pf.applicantNotificationContent,
            editApplicationStatus: pf.editApplicationStatus,
            applicantViewFormAfterCompletion:
              pf.applicantViewFormAfterCompletion,
          };
        });

        return {
          ...process,
          processName: process.name,
          processStatus: process.status,
          updatedAt: process.updatedAt?.toISOString(),
          processForms: forms.filter((form) => form !== null),
        };
      }),
    );

    return {
      success: true,
      data: formattedProcesses,
    };
  }

  async findOne(id: string): Promise<{ success: boolean; data: any } | null> {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: {
        forms: {
          include: {
            form: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                archived: true,
                creatorId: true,
                createdAt: true,
                updatedAt: true,
                design: true,
              },
            },
          },
        },
      },
    });

    if (!process) {
      return null;
    }

    // Format forms to include both ProcessForm fields and form details
    const forms = process.forms.map((pf) => ({
      id: pf.id,
      processId: pf.processId,
      formId: pf.formId,
      order: pf.order,
      nextStepType: pf.nextStepType,
      nextStepRoles: pf.nextStepRoles,
      nextStaffId: pf.nextStaffId,
      nextStepSpecifiedTo: pf.nextStepSpecifiedTo,
      notificationType: pf.notificationType,
      notificationRoles: pf.notificationRoles,
      notificationToId: pf.notificationToId,
      notificationComment: pf.notificationComment,
      notifyApplicant: pf.notifyApplicant,
      applicantNotificationContent: pf.applicantNotificationContent,
      editApplicationStatus: pf.editApplicationStatus,
      applicantViewFormAfterCompletion: pf.applicantViewFormAfterCompletion,
      createdAt: pf.createdAt,
      updatedAt: pf.updatedAt,
      form: pf.form,
    }));

    return {
      success: true,
      data: {
        ...process,
        forms: forms.filter((form) => form !== null),
      },
    };
  }

  async update(id: string, data: UpdateProcessDto): Promise<Process> {
    const { name, groupId, status, archived } = data;

    const updatedProcess = await this.prisma.process.update({
      where: { id },
      data: {
        name,
        groupId,
        status,
        archived: archived !== undefined ? archived : false,
      },
    });

    await this.auditLogService.log({
      userId: updatedProcess.creatorId,
      action: 'PROCESS_UPDATED',
      resource: 'Process',
      resourceId: updatedProcess.id,
      status: 'SUCCESS',
      details: { name: updatedProcess.name, changes: data },
    });
    return updatedProcess;
  }

  async remove(id: string): Promise<Process> {
    const deletedProcess = await this.prisma.process.delete({ where: { id } });
    await this.auditLogService.log({
      userId: deletedProcess.creatorId,
      action: 'PROCESS_DELETED',
      resource: 'Process',
      resourceId: deletedProcess.id,
      status: 'SUCCESS',
      details: { name: deletedProcess.name },
    });
    return deletedProcess;
  }

  async submitProcessForm(
    processId: string,
    configData: {
      staffViewForms: boolean;
      applicantViewProcessLevel: boolean;
      processForms: {
        formId: string;
        order: number;
        nextStepType: string;
        nextStepSpecifiedTo?: string;
        nextStaffId?: string;
        nextStepRoles?: string[];
        notificationType?: string;
        notificationRoles?: string[];
        notificationToId?: string;
        notificationComment?: string;
        notifyApplicant?: boolean;
        applicantNotificationContent?: string;
        editApplicationStatus?: boolean;
        applicantViewFormAfterCompletion?: boolean;
      }[];
    },
  ): Promise<Process> {
    const { processForms, ...updateData } = configData;

    // Update process settings
    const updatedProcess = await this.prisma.process.update({
      where: { id: processId },
      data: updateData,
    });

    // Delete existing process forms and create new ones
    await this.prisma.processForm.deleteMany({ where: { processId } });
    await this.prisma.processForm.createMany({
      data: processForms.map((pf) => ({
        ...pf,
        processId,
        nextStepType: pf.nextStepType as NextStepType,
        notificationType: pf.notificationType as NextStepType,
      })),
    });
    await this.auditLogService.log({
      userId: updatedProcess.creatorId,
      action: 'PROCESS_FORM_CONFIGURED',
      resource: 'Process',
      resourceId: updatedProcess.id,
      status: 'SUCCESS',
      details: { processId: updatedProcess.id, formCount: processForms.length },
    });
    return updatedProcess;
  }

  async duplicate(processId: string, creatorId: string): Promise<Process> {
    const originalProcess = await this.prisma.process.findUnique({
      where: { id: processId },
      include: { forms: true, roles: true }, // Include related forms and roles
    });

    if (!originalProcess) {
      throw new NotFoundException(`Process with ID ${processId} not found.`);
    }

    const duplicatedProcess = await this.prisma.process.create({
      data: {
        name: `${originalProcess.name} - copy`,
        type: originalProcess.type,
        groupId: originalProcess.groupId,
        creatorId: creatorId,
        status: originalProcess.status,
        archived: originalProcess.archived,
        staffViewForms: originalProcess.staffViewForms,
        applicantViewProcessLevel: originalProcess.applicantViewProcessLevel,
        forms: {
          create: originalProcess.forms.map((form) => ({
            formId: form.formId,
            order: form.order,
            nextStepType: form.nextStepType,
            nextStepSpecifiedTo: form.nextStepSpecifiedTo,
            nextStaffId: form.nextStaffId,
            nextStepRoles: form.nextStepRoles,
            notificationType: form.notificationType,
            notificationRoles: form.notificationRoles,
            notificationToId: form.notificationToId,
            notificationComment: form.notificationComment,
            notifyApplicant: form.notifyApplicant,
            applicantNotificationContent: form.applicantNotificationContent,
            editApplicationStatus: form.editApplicationStatus,
            applicantViewFormAfterCompletion:
              form.applicantViewFormAfterCompletion,
          })),
        },
        roles: {
          create: originalProcess.roles.map((role) => ({
            roleId: role.roleId,
            status: role.status,
          })),
        },
      },
    });
    await this.auditLogService.log({
      userId: creatorId,
      action: 'PROCESS_DUPLICATED',
      resource: 'Process',
      resourceId: duplicatedProcess.id,
      status: 'SUCCESS',
      details: {
        originalProcessId: processId,
        newProcessName: duplicatedProcess.name,
      },
    });
    return duplicatedProcess;
  }
}
