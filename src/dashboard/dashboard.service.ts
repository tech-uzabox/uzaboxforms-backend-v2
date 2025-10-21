import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Dashboard, Prisma } from 'db/client';
import { AuthenticatedUser } from 'src/auth/decorators/get-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

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

  async createDashboard(
    data: CreateDashboardDto,
    user: AuthenticatedUser,
  ) {
    const dashboard = await this.create(data, user);

    return {
      success: true,
      message: 'Dashboard created successfully',
      data: dashboard,
    };
  }

  async findAll(): Promise<Dashboard[]> {
    return this.prisma.dashboard.findMany();
  }

  async findAllForUser(user: AuthenticatedUser): Promise<Dashboard[]> {

    const isAdmin = user.roles.includes('Admin');
    const whereCondition: Prisma.DashboardWhereInput = isAdmin
      ? {} // Admins see all dashboards
      : {
          OR: [
            { allowedUsers: { has: user.id } },
            { allowedRoles: { hasSome: user.roleIds } },
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

  async findAllDashboardsForUser(user: AuthenticatedUser) {
    const dashboards = await this.findAllForUser(user);

    return {
      success: true,
      data: dashboards,
      count: dashboards.length,
    };
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
      throw new NotFoundException('Dashboard not found')
    }

    // Check permissions
    const isAllowedUser = dashboard.allowedUsers.includes(user.id);
    const isAllowedRole = dashboard.allowedRoles.some((role) =>
      user.roleIds.includes(role),
    );
    const isAdmin = user.roles.includes('Admin');

    if (!isAllowedUser && !isAllowedRole && !isAdmin) {
      throw new Error('Access denied');
    }

    return dashboard;
  }

  async findOneDashboard(id: string, user: AuthenticatedUser) {
    const dashboard = await this.findOne(id, user);

    return {
      success: true,
      data: dashboard,
    };
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

    const isAdmin = user.roles.includes('Admin');

    if (!isAdmin) {
      throw new Error('Only admins can update the dashboard');
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

  async updateDashboard(
    id: string,
    data: UpdateDashboardDto,
    user: AuthenticatedUser,
  ) {
    const updatedDashboard = await this.update(id, data, user);

    return {
      success: true,
      message: 'Dashboard updated successfully',
      data: updatedDashboard,
    };
  }

  async remove(id: string, user: AuthenticatedUser): Promise<Dashboard> {
    // Check if user is owner
    const dashboard = await this.prisma.dashboard.findUnique({ where: { id } });
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const isAdmin = user.roles.includes('Admin');

    if (!isAdmin) {
      throw new Error('Only admins can update the dashboard');
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

  async removeDashboard(id: string, user: AuthenticatedUser) {
    const deletedDashboard = await this.remove(id, user);

    return {
      success: true,
      message: 'Dashboard deleted successfully',
      data: deletedDashboard,
    };
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
    const isAdmin =
      user.roles.includes('Admin');

    if (!isAdmin) {
      throw new Error('Only admins can update the dashboard');
    }

    const canModify =
      isAdmin || dashboard.allowedUsers.includes(user.id);

    if (!canModify) {
      throw new Error('Access denied to modify dashboard');
    }

    return this.update(id, { layout }, user);
  }

  async updateDashboardWidgetOrder(
    id: string,
    layout: any,
    user: AuthenticatedUser,
  ) {
    const updatedDashboard = await this.updateWidgetOrder(id, layout, user);

    return {
      success: true,
      message: 'Widget order updated successfully',
      data: updatedDashboard,
    };
  }
}
