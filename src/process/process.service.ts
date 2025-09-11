import { Injectable, NotFoundException } from '@nestjs/common';
import { NextStepType, Prisma, Process } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';

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
    } = data;
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
      },
    });
    await this.auditLogService.log({
      userId: newProcess.creatorId,
      action: 'PROCESS_CREATED',
      resource: 'Process',
      resourceId: newProcess.id,
      status: 'SUCCESS',
      details: { name: newProcess.name, type: newProcess.type },
    });
    return newProcess;
  }

  async findAll(): Promise<Process[]> {
    return this.prisma.process.findMany();
  }

  async findOne(id: string): Promise<Process | null> {
    return this.prisma.process.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.ProcessUpdateInput): Promise<Process> {
    const updatedProcess = await this.prisma.process.update({
      where: { id },
      data,
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
        nextStaffId?: string;
        nextStepRoles?: string[];
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
}
