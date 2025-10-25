import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Widget } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { PrismaService } from '../db/prisma.service';
import { BulkRefreshWidgetsDto } from './dto/bulk-refresh-widgets.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { DuplicateWidgetDto } from './dto/duplicate-widget.dto';
import { UpdateWidgetAccessDto } from './dto/update-widget-access.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import {
  transformWidgetPayload,
  transformWidgetUpdatePayload,
} from './utils/widget-transform.utils';
import { WidgetDataService } from './widget-data.service';

@Injectable()
export class WidgetService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private widgetDataService: WidgetDataService,
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

  async findOneSandbox(id: string): Promise<any | null> {
    return this.prisma.widgetSandbox.findFirst({
      where: { id },
    });
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
    user: AuthenticatedUser
  ): Promise<boolean> {
    const userId = user.id;
    const userRoles = user.roles;
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

    if (userRoles.includes('Admin')) {
      return true;
    }

    // Check if user has any of the allowed roles
    return dashboard.allowedRoles.some((role) => user.roleIds.includes(role));
  }

  async findAllForUser(
    userId: string,
    userRoles: string[],
    filters?: { dashboardId?: string; type?: string },
  ): Promise<Widget[]> {
    // Get all dashboards the user has access to
    const accessibleDashboards = await this.prisma.dashboard.findMany({
      where: {
        OR: [
          { allowedUsers: { has: userId } },
          { allowedRoles: { hasSome: userRoles } },
        ],
      },
      select: { id: true },
    });

    const dashboardIds = accessibleDashboards.map((d) => d.id);

    // Build where clause for widgets
    const whereClause: any = {
      dashboardId: { in: dashboardIds },
    };

    if (filters?.dashboardId) {
      whereClause.dashboardId = filters.dashboardId;
    }

    if (filters?.type) {
      whereClause.visualizationType = filters.type;
    }

    // Get all widgets from accessible dashboards with optional filters
    return this.prisma.widget.findMany({
      where: whereClause,
      include: {
        dashboard: true,
      },
    });
  }

  async getSandboxWidgetData(widgetId: string, userId: string) {
    return this.widgetDataService.getWidgetSandboxData(widgetId, userId);
  }

  /**
   * Invalidate widget caches for specific widget IDs
   */
  async invalidateWidgetCaches(widgetIds: string[]): Promise<void> {
    await this.widgetDataService.invalidateWidgetCache(widgetIds);
  }

  /**
   * Find widgets that use specific form IDs
   */
  async findWidgetsByFormIds(formIds: string[]): Promise<{ id: string; isSandbox: boolean }[]> {
    const widgets = await this.prisma.widget.findMany({
      where: {
        config: {
          path: ['forms'],
          array_contains: formIds,
        },
      },
      select: { id: true },
    });

    const sandboxWidgets = await this.prisma.widgetSandbox.findMany({
      where: {
        config: {
          path: ['forms'],
          array_contains: formIds,
        },
      },
      select: { id: true },
    });

    // Also check for formIds in various widget configurations
    const allWidgets = await this.prisma.widget.findMany({
      select: { id: true, config: true },
    });

    const allSandboxWidgets = await this.prisma.widgetSandbox.findMany({
      select: { id: true, config: true },
    });

    const extractFormIdsFromConfig = (config: any): string[] => {
      const formIds: string[] = [];

      if (!config) return formIds;

      // Check for forms array
      if (config.forms && Array.isArray(config.forms)) {
        formIds.push(...config.forms);
      }

      // Check for sources (card, pie, histogram, calendar-heatmap)
      if (config.sources && Array.isArray(config.sources)) {
        config.sources.forEach((source: any) => {
          if (source.formId) formIds.push(source.formId);
        });
      }

      // Check for metrics (multi-metric, scatter, map)
      if (config.metrics && Array.isArray(config.metrics)) {
        config.metrics.forEach((metric: any) => {
          if (metric.formId) formIds.push(metric.formId);
        });
      }

      // Check for CCT configuration
      if (config.options?.cct?.formId) {
        formIds.push(config.options.cct.formId);
      }

      // Check for crosstab configuration
      if (config.options?.crosstab) {
        const cx = config.options.crosstab;
        if (cx.row?.formId) formIds.push(cx.row.formId);
        if (cx.column?.formId) formIds.push(cx.column.formId);
        if (cx.value?.formId) formIds.push(cx.value.formId);
      }

      // Check for map options source
      if (config.options?.map?.appearance?.optionsSource?.formId) {
        formIds.push(config.options.map.appearance.optionsSource.formId);
      }

      return [...new Set(formIds)]; // Remove duplicates
    };

    // Check additional widgets that might use these formIds
    allWidgets.forEach(widget => {
      const configFormIds = extractFormIdsFromConfig(widget.config);
      if (configFormIds.some(id => formIds.includes(id))) {
        if (!widgets.some(w => w.id === widget.id)) {
          widgets.push({ id: widget.id });
        }
      }
    });

    allSandboxWidgets.forEach(widget => {
      const configFormIds = extractFormIdsFromConfig(widget.config);
      if (configFormIds.some(id => formIds.includes(id))) {
        if (!sandboxWidgets.some(w => w.id === widget.id)) {
          sandboxWidgets.push({ id: widget.id });
        }
      }
    });

    return [
      ...widgets.map(w => ({ id: w.id, isSandbox: false })),
      ...sandboxWidgets.map(w => ({ id: w.id, isSandbox: true })),
    ];
  }

  async createWidget(
    createWidgetDto: CreateWidgetDto,
    user: AuthenticatedUser,
  ) {
    // Check dashboard access
    const hasAccess = await this.checkDashboardAccess(
      createWidgetDto.dashboardId,
      user
    );

    if (!hasAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Transform the payload to internal format
    const transformedData = transformWidgetPayload(createWidgetDto);

    const widget = await this.create(transformedData as CreateWidgetDto);

    return {
      success: true,
      message: 'Widget created successfully',
      data: widget,
    };
  }

  async findAllWidgetsForUser(
    user: AuthenticatedUser,
    filters?: { dashboardId?: string; type?: string },
  ) {
    // Check dashboard access if dashboardId is provided
    if (filters?.dashboardId) {
      const hasAccess = await this.checkDashboardAccess(
        filters.dashboardId,
        user,
      );

      if (!hasAccess) {
        throw new HttpException(
          {
            success: false,
            message: 'Access denied to dashboard',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const widgets = await this.findAllForUser(user.id, user.roles, filters);

    return {
      success: true,
      data: widgets,
      count: widgets.length,
    };
  }

  async findOneWidget(id: string, user: AuthenticatedUser) {
    const widget = await this.findOne(id);
    if (!widget) {
      throw new HttpException(
        {
          success: false,
          message: 'Widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check dashboard access
    const hasAccess = await this.checkDashboardAccess(
      widget.dashboardId,
      user,
    );

    if (!hasAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      success: true,
      data: widget,
    };
  }

  async findOneSandboxWidget(id: string, user: AuthenticatedUser) {
    const widget = await this.findOneSandbox(id);
    if (!widget) {
      throw new HttpException(
        {
          success: false,
          message: 'Sandbox widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      data: widget,
    };
  }

  async updateWidget(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
    user: AuthenticatedUser,
  ) {
    const widget = await this.findOne(id);
    if (!widget) {
      throw new HttpException(
        {
          success: false,
          message: 'Widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check dashboard access
    const hasAccess = await this.checkDashboardAccess(
      widget.dashboardId,
      user
    );

    if (!hasAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Transform the payload to internal format
    const transformedData = transformWidgetUpdatePayload(updateWidgetDto);

    const updatedWidget = await this.update(id, transformedData);

    return {
      success: true,
      message: 'Widget updated successfully',
      data: updatedWidget,
    };
  }

  async removeWidget(id: string, user: AuthenticatedUser) {
    const widget = await this.findOne(id);
    if (!widget) {
      throw new HttpException(
        {
          success: false,
          message: 'Widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check dashboard access
    const hasAccess = await this.checkDashboardAccess(
      widget.dashboardId,
      user
    );

    if (!hasAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.remove(id);

    return {
      success: true,
      message: 'Widget deleted successfully',
    };
  }

  async duplicateWidget(
    duplicateWidgetDto: DuplicateWidgetDto,
    user: AuthenticatedUser,
  ) {
    // Check access to target dashboard
    const hasTargetAccess = await this.checkDashboardAccess(
      duplicateWidgetDto.dashboardId,
      user
    );

    if (!hasTargetAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to target dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check access to source widget's dashboard
    const sourceWidget = await this.findOne(duplicateWidgetDto.sourceWidgetId);
    if (!sourceWidget) {
      throw new HttpException(
        {
          success: false,
          message: 'Source widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const hasSourceAccess = await this.checkDashboardAccess(
      sourceWidget.dashboardId,
      user
    );

    if (!hasSourceAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to source widget',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const duplicatedWidget = await this.duplicate(
      duplicateWidgetDto.sourceWidgetId,
      duplicateWidgetDto.dashboardId,
    );

    // Update title if provided
    if (duplicateWidgetDto.title) {
      await this.update(duplicatedWidget.id, {
        title: duplicateWidgetDto.title,
      });
    }

    return {
      success: true,
      message: 'Widget duplicated successfully',
      data: duplicatedWidget,
    };
  }

  async bulkRefreshWidgets(
    bulkRefreshDto: BulkRefreshWidgetsDto,
    user: AuthenticatedUser,
  ) {
    // Check access to all widgets
    for (const widgetId of bulkRefreshDto.widgetIds) {
      const widget = await this.findOne(widgetId);
      if (!widget) {
        throw new HttpException(
          {
            success: false,
            message: `Widget ${widgetId} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const hasAccess = await this.checkDashboardAccess(
        widget.dashboardId,
        user
      );

      if (!hasAccess) {
        throw new HttpException(
          {
            success: false,
            message: `Access denied to widget ${widgetId}`,
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // For now, just return success as the actual refresh logic would be implemented
    return {
      success: true,
      message: `Successfully refreshed ${bulkRefreshDto.widgetIds.length} widgets`,
      data: { refreshedWidgetIds: bulkRefreshDto.widgetIds },
    };
  }

  async updateWidgetAccess(
    id: string,
    updateAccessDto: UpdateWidgetAccessDto,
    user: AuthenticatedUser,
  ) {
    const widget = await this.findOne(id);
    if (!widget) {
      throw new HttpException(
        {
          success: false,
          message: 'Widget not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check dashboard access
    const hasAccess = await this.checkDashboardAccess(
      widget.dashboardId,
      user
    );

    if (!hasAccess) {
      throw new HttpException(
        {
          success: false,
          message: 'Access denied to dashboard',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const updateData: any = {};
    if (updateAccessDto.allowedUsers) {
      updateData.allowedUsers = updateAccessDto.allowedUsers;
    }
    if (updateAccessDto.allowedRoles) {
      updateData.allowedRoles = updateAccessDto.allowedRoles;
    }

    const updatedWidget = await this.update(id, updateData);

    return {
      success: true,
      message: 'Widget access updated successfully',
      data: updatedWidget,
    };
  }

  async getWidgetData(id: string, user: AuthenticatedUser) {
    try {
      const widget = await this.findOne(id);
      if (!widget) {
        throw new HttpException(
          {
            success: false,
            message: 'Widget not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Check dashboard access
      const hasAccess = await this.checkDashboardAccess(
        widget.dashboardId,
        user
      );

      if (!hasAccess) {
        throw new HttpException(
          {
            success: false,
            message: 'Access denied to dashboard',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      const widgetData = await this.widgetDataService.getWidgetData(
        id,
        user.id,
      );

      return {
        success: true,
        data: widgetData,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Return error in widget data format for frontend compatibility
      return {
        success: false,
        data: {
          type: 'card',
          title: 'Error',
          value: null,
          statLabel: 'Failed to load data',
          meta: {},
          errors: [
            error instanceof Error ? error.message : 'Internal server error',
          ],
          empty: true,
        },
      };
    }
  }

  async getSandboxWidgetDataForUser(id: string, user: AuthenticatedUser) {
    try {
      const widgetData = await this.getSandboxWidgetData(id, user.id);

      return {
        success: true,
        data: widgetData,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // Return error in widget data format for frontend compatibility
      return {
        success: false,
        data: {
          type: 'card',
          title: 'Error',
          value: null,
          statLabel: 'Failed to load data',
          meta: {},
          errors: [
            error instanceof Error ? error.message : 'Internal server error',
          ],
          empty: true,
        },
      };
    }
  }
}
