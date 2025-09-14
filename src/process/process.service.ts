import { Injectable, NotFoundException } from '@nestjs/common';
import { NextStepType, Process, Role } from 'db';
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

  async findAll(): Promise<ProcessWithRoles[]> {
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

    // Hoist roles to return just Role[] instead of {role: Role}[]
    return processes.map((process) => ({
      ...process,
      roles:
        (process as unknown as { roles: { role: Role }[] }).roles?.map(
          (roleRelation) => roleRelation.role,
        ) || [],
    })) as unknown as ProcessWithRoles[];
  }

  async findOne(id: string): Promise<Process | null> {
    const process = await this.prisma.process.findUnique({
      where: { id },
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

    // Hoist roles to return just Role[] instead of {role: Role}[]
    return process
      ? ({
          ...process,
          roles:
            (process as unknown as { roles: { role: Role }[] }).roles?.map(
              (roleRelation) => roleRelation.role,
            ) || [],
        } as ProcessWithRoles)
      : null;
  }

  async update(id: string, data: UpdateProcessDto): Promise<Process> {
    const { roles, ...processData } = data;

    // Use transaction to handle role synchronization atomically
    const updatedProcess = await this.prisma.$transaction(async (tx) => {
      // If roles is provided, handle role synchronization
      if (roles !== undefined) {
        // Validate roles exist if provided
        if (roles.length > 0) {
          const existingRoles = await tx.role.findMany({
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

        // Get current process roles
        const currentProcessRoles = await tx.processRole.findMany({
          where: { processId: id },
          select: { roleId: true },
        });
        const currentRoleIds = currentProcessRoles.map((pr) => pr.roleId);

        // Determine roles to add and remove
        const rolesToAdd = roles.filter(
          (roleId) => !currentRoleIds.includes(roleId),
        );
        const rolesToRemove = currentRoleIds.filter(
          (roleId) => !roles.includes(roleId),
        );

        // Delete removed process roles
        if (rolesToRemove.length > 0) {
          await tx.processRole.deleteMany({
            where: {
              processId: id,
              roleId: { in: rolesToRemove },
            },
          });
        }

        // Create new process roles
        if (rolesToAdd.length > 0) {
          await tx.processRole.createMany({
            data: rolesToAdd.map((roleId) => ({
              processId: id,
              roleId,
              status: 'ENABLED',
            })),
          });
        }
      }

      // Update the process itself
      return tx.process.update({
        where: { id },
        data: processData,
        include: {
          creator: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
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

    let newProcessName = `${originalProcess.name} - Copy`;
    let counter = 1;
    while (
      await this.prisma.process.findFirst({ where: { name: newProcessName } })
    ) {
      counter++;
      newProcessName = `${originalProcess.name} - Copy (${counter})`;
    }

    const duplicatedProcess = await this.prisma.process.create({
      data: {
        name: newProcessName,
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
            nextStaffId: form.nextStaffId,
            nextStepRoles: form.nextStepRoles,
            notificationType: form.notificationType,
            notificationRoles: form.notificationRoles,
            notificationToId: form.notificationToId,
            notificationComment: form.notificationComment,
            notifyApplicant: form.notifyApplicant,
            applicantNotificationContent: form.applicantNotificationContent,
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

  async getProcessFormsByProcessIdAndUserId(
    processId: string,
    userId: string,
    currentUser: { id: string; roles: string[] },
  ): Promise<{ success: boolean; message?: string; data?: any[] }> {
    // Get user's enabled roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        status: 'ENABLED',
      },
      select: { roleId: true },
    });

    if (!userRoles.length) {
      return { success: false, message: 'User has no enabled roles' };
    }

    const roleIds = userRoles.map((role) => role.roleId);

    // Get process forms with form details
    const processForms = await this.prisma.processForm.findMany({
      where: { processId },
      include: {
        form: true,
      },
    });

    // Filter accessible forms based on roles
    const accessibleForms: any[] = [];
    for (const processForm of processForms) {
      if (!processForm.form || processForm.form.status !== 'ENABLED') {
        continue;
      }

      // Check if user has access to this form via roles
      const formRoles = await this.prisma.role.findMany({
        where: {
          id: { in: roleIds },
          status: 'ENABLED',
        },
      });

      if (formRoles.length > 0) {
        accessibleForms.push(processForm);
      }
    }

    if (!accessibleForms.length) {
      return { success: false, message: 'No accessible forms found' };
    }

    return {
      success: true,
      data: accessibleForms.map((form) => ({
        _id: form.id,
        formId: form.form,
        nextStepType: form.nextStepType,
        formName: form.form?.name,
      })),
    };
  }

  async getProcessForm(
    processId: string,
    formId: string,
    currentUser: any,
  ): Promise<any> {
    const processForm = await this.prisma.processForm.findFirst({
      where: { processId, formId },
      include: { form: true },
    });

    if (!processForm) {
      return { success: false, message: 'Process form not found' };
    }

    return { success: true, processForm };
  }
}
