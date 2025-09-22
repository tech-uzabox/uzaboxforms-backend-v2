import { Injectable } from '@nestjs/common';
import { Dashboard, Prisma } from 'db';
import { AuthenticatedUser } from 'src/auth/decorators/get-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    data: CreateDashboardDto,
    user: AuthenticatedUser,
  ): Promise<Dashboard> {
    const newDashboard = await this.prisma.dashboard.create({
      data: {
        ...data,
        ownerId: user.id,
      },
    });
    await this.auditLogService.log({
      userId: newDashboard.ownerId,
      action: 'DASHBOARD_CREATED',
      resource: 'Dashboard',
      resourceId: newDashboard.id,
      status: 'SUCCESS',
      details: { name: newDashboard.name },
    });
    return newDashboard;
  }

  async findAll(): Promise<Dashboard[]> {
    return this.prisma.dashboard.findMany();
  }

  async findAllForUser(userId: string, roles: string[]): Promise<Dashboard[]> {
    const dashboards = await this.prisma.dashboard.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { allowedUsers: { has: userId } },
          { allowedRoles: { hasSome: roles } },
        ],
      },
    });
    return dashboards;
  }

  async findOne(id: string): Promise<Dashboard | null> {
    return this.prisma.dashboard.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.DashboardUpdateInput,
  ): Promise<Dashboard> {
    const updatedDashboard = await this.prisma.dashboard.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedDashboard.ownerId,
      action: 'DASHBOARD_UPDATED',
      resource: 'Dashboard',
      resourceId: updatedDashboard.id,
      status: 'SUCCESS',
      details: { name: updatedDashboard.name, changes: data },
    });
    return updatedDashboard;
  }

  async remove(id: string): Promise<Dashboard> {
    const deletedDashboard = await this.prisma.dashboard.delete({
      where: { id },
    });
    await this.auditLogService.log({
      userId: deletedDashboard.ownerId,
      action: 'DASHBOARD_DELETED',
      resource: 'Dashboard',
      resourceId: deletedDashboard.id,
      status: 'SUCCESS',
      details: { name: deletedDashboard.name },
    });
    return deletedDashboard;
  }
}
