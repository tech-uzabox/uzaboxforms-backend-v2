import { Injectable } from '@nestjs/common';
import { Dashboard, Prisma } from 'db/client';
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
        layout: data.layout || { order: [], layouts: {} }, // Initialize layout
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
    const isAdmin = roles.includes('Admin') || roles.includes('SuperAdmin');
    const whereCondition = isAdmin
      ? {} // Admins see all dashboards
      : {
          OR: [
            { ownerId: userId },
            { allowedUsers: { has: userId } },
            { allowedRoles: { hasSome: roles } },
          ],
        };

    const dashboards = await this.prisma.dashboard.findMany({
      where: whereCondition,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return dashboards;
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Dashboard | null> {
    // First check if dashboard exists and user has access
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        widgets: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!dashboard) {
      return null;
    }

    // Check permissions
    const isOwner = dashboard.ownerId === user.id;
    const isAllowedUser = dashboard.allowedUsers.includes(user.id);
    const isAllowedRole = dashboard.allowedRoles.some((role) =>
      user.roles.includes(role),
    );
    const isAdmin =
      user.roles.includes('Admin') || user.roles.includes('SuperAdmin');

    if (!isOwner && !isAllowedUser && !isAllowedRole && !isAdmin) {
      throw new Error('Access denied');
    }

    return dashboard;
  }

  async update(
    id: string,
    data: Prisma.DashboardUpdateInput,
    user: AuthenticatedUser,
  ): Promise<Dashboard> {
    // Check if user is owner
    const dashboard = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (dashboard.ownerId !== user.id) {
      throw new Error('Only dashboard owner can update properties');
    }

    const updatedDashboard = await this.prisma.dashboard.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
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

  async remove(id: string, user: AuthenticatedUser): Promise<Dashboard> {
    // Check if user is owner
    const dashboard = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (dashboard.ownerId !== user.id) {
      throw new Error('Only dashboard owner can delete the dashboard');
    }

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

  async updateWidgetOrder(
    id: string,
    layout: any,
    user: AuthenticatedUser,
  ): Promise<Dashboard> {
    // Check if user has access to modify the dashboard
    const dashboard = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const canModify =
      dashboard.ownerId === user.id || dashboard.allowedUsers.includes(user.id);

    if (!canModify) {
      throw new Error('Access denied to modify dashboard');
    }

    return this.update(id, { layout }, user);
  }
}
