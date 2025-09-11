import { Injectable } from '@nestjs/common';
import { Prisma, ProcessRole } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ProcessRoleService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(processId: string, roleId: string): Promise<ProcessRole> {
    const newProcessRole = await this.prisma.processRole.create({
      data: { processId, roleId },
    });
    await this.auditLogService.log({
      action: 'PROCESS_ROLE_CREATED',
      resource: 'ProcessRole',
      resourceId: `${newProcessRole.processId}-${newProcessRole.roleId}`,
      status: 'SUCCESS',
      details: {
        processId: newProcessRole.processId,
        roleId: newProcessRole.roleId,
      },
    });
    return newProcessRole;
  }

  async createMany(
    data: Prisma.ProcessRoleCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    const result = await this.prisma.processRole.createMany({ data });
    await this.auditLogService.log({
      action: 'PROCESS_ROLES_CREATED_MANY',
      resource: 'ProcessRole',
      status: 'SUCCESS',
      details: { count: result.count, roles: data.map((d) => d.roleId) },
    });
    return result;
  }

  async findAll(): Promise<ProcessRole[]> {
    return this.prisma.processRole.findMany();
  }

  async findOne(
    processId: string,
    roleId: string,
  ): Promise<ProcessRole | null> {
    return this.prisma.processRole.findUnique({
      where: { processId_roleId: { processId, roleId } },
    });
  }

  async findByProcessId(processId: string): Promise<ProcessRole[]> {
    return this.prisma.processRole.findMany({ where: { processId } });
  }

  async update(
    processId: string,
    roleId: string,
    data: Prisma.ProcessRoleUpdateInput,
  ): Promise<ProcessRole> {
    const updatedProcessRole = await this.prisma.processRole.update({
      where: { processId_roleId: { processId, roleId } },
      data,
    });
    await this.auditLogService.log({
      action: 'PROCESS_ROLE_UPDATED',
      resource: 'ProcessRole',
      resourceId: `${updatedProcessRole.processId}-${updatedProcessRole.roleId}`,
      status: 'SUCCESS',
      details: {
        processId: updatedProcessRole.processId,
        roleId: updatedProcessRole.roleId,
        changes: data,
      },
    });
    return updatedProcessRole;
  }

  async remove(processId: string, roleId: string): Promise<ProcessRole> {
    const deletedProcessRole = await this.prisma.processRole.delete({
      where: { processId_roleId: { processId, roleId } },
    });
    await this.auditLogService.log({
      action: 'PROCESS_ROLE_DELETED',
      resource: 'ProcessRole',
      resourceId: `${deletedProcessRole.processId}-${deletedProcessRole.roleId}`,
      status: 'SUCCESS',
      details: {
        processId: deletedProcessRole.processId,
        roleId: deletedProcessRole.roleId,
      },
    });
    return deletedProcessRole;
  }
}
