import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Widget } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';

@Injectable()
export class WidgetService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateWidgetDto): Promise<Widget> {
    const count = await this.prisma.widget.count();
    const newWidget = await this.prisma.widget.create({
      data: {
        title: data.title,
        visualizationType: data.visualizationType,
        description: data.description,
        config: data.config,
        order: count + 1,
        dashboardId: data.dashboardId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await this.auditLogService.log({
      action: 'WIDGET_CREATED',
      resource: 'Widget',
      resourceId: newWidget.id,
      status: 'SUCCESS',
      details: { title: newWidget.title, dashboardId: newWidget.dashboardId },
    });
    return newWidget;
  }

  async findAll(): Promise<Widget[]> {
    return this.prisma.widget.findMany();
  }

  async findOne(id: string): Promise<Widget | null> {
    return this.prisma.widget.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateWidgetDto): Promise<Widget> {
    const updatedWidget = await this.prisma.widget.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      action: 'WIDGET_UPDATED',
      resource: 'Widget',
      resourceId: updatedWidget.id,
      status: 'SUCCESS',
      details: { title: updatedWidget.title, changes: data },
    });
    return updatedWidget;
  }

  async remove(id: string): Promise<Widget> {
    const deletedWidget = await this.prisma.widget.delete({ where: { id } });
    await this.auditLogService.log({
      action: 'WIDGET_DELETED',
      resource: 'Widget',
      resourceId: deletedWidget.id,
      status: 'SUCCESS',
      details: { title: deletedWidget.title },
    });
    return deletedWidget;
  }

  async duplicate(widgetId: string, newDashboardId: string): Promise<Widget> {
    const originalWidget = await this.prisma.widget.findUnique({
      where: { id: widgetId },
    });

    if (!originalWidget) {
      await this.auditLogService.log({
        action: 'WIDGET_DUPLICATION_FAILED',
        resource: 'Widget',
        resourceId: widgetId,
        status: 'FAILURE',
        errorMessage: 'Widget not found for duplication.',
      });
      throw new NotFoundException(`Widget with ID ${widgetId} not found.`);
    }

    // Explicitly pick fields to duplicate
    const dataToDuplicate = {
      title: originalWidget.title,
      visualizationType: originalWidget.visualizationType,
      config: originalWidget.config || Prisma.JsonNull,
      order: originalWidget.order,
      // Do not include id, dashboardId, createdAt, updatedAt
    };

    const duplicatedWidget = await this.prisma.widget.create({
      data: {
        ...dataToDuplicate,
        dashboardId: newDashboardId,
      },
    });
    await this.auditLogService.log({
      action: 'WIDGET_DUPLICATED',
      resource: 'Widget',
      resourceId: duplicatedWidget.id,
      status: 'SUCCESS',
      details: {
        originalWidgetId: widgetId,
        newWidgetTitle: duplicatedWidget.title,
      },
    });
    return duplicatedWidget;
  }

  async checkDashboardAccess(
    dashboardId: string,
    userId: string,
    userRoles: string[],
  ): Promise<boolean> {
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      return false;
    }

    // Check if user is the owner
    if (dashboard.ownerId === userId) {
      return true;
    }

    // Check if user is in allowed users
    if (dashboard.allowedUsers.includes(userId)) {
      return true;
    }

    // Check if user has any of the allowed roles
    return dashboard.allowedRoles.some((role) => userRoles.includes(role));
  }

  async findAllForUser(userId: string, userRoles: string[]): Promise<Widget[]> {
    // Get all dashboards the user has access to
    const accessibleDashboards = await this.prisma.dashboard.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { allowedUsers: { has: userId } },
          { allowedRoles: { hasSome: userRoles } },
        ],
      },
      select: { id: true },
    });

    const dashboardIds = accessibleDashboards.map((d) => d.id);

    // Get all widgets from accessible dashboards
    return this.prisma.widget.findMany({
      where: {
        dashboardId: { in: dashboardIds },
      },
      include: {
        dashboard: true,
      },
    });
  }
}
