import { Injectable } from '@nestjs/common';
import { Prisma, Role } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    const newRole = await this.prisma.role.create({ data });
    await this.auditLogService.log({
      action: 'ROLE_CREATED',
      resource: 'Role',
      resourceId: newRole.id,
      status: 'SUCCESS',
      details: { name: newRole.name },
    });
    return newRole;
  }

  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany();
  }

  async findOne(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id } });
  }

  async findOneByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { name } });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      action: 'ROLE_UPDATED',
      resource: 'Role',
      resourceId: updatedRole.id,
      status: 'SUCCESS',
      details: { name: updatedRole.name, changes: data },
    });
    return updatedRole;
  }

  async remove(id: string): Promise<Role> {
    const deletedRole = await this.prisma.role.delete({ where: { id } });
    await this.auditLogService.log({
      action: 'ROLE_DELETED',
      resource: 'Role',
      resourceId: deletedRole.id,
      status: 'SUCCESS',
      details: { name: deletedRole.name },
    });
    return deletedRole;
  }
}
