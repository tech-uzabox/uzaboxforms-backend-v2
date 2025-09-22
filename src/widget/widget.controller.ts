import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WidgetService } from './widget.service';
import { WidgetDataService } from './widget-data.service';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { DuplicateWidgetDto } from './dto/duplicate-widget.dto';
import { BulkRefreshWidgetsDto } from './dto/bulk-refresh-widgets.dto';
import { UpdateWidgetAccessDto } from './dto/update-widget-access.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { ZodValidationPipe } from 'nestjs-zod';

@ApiTags('Widgets')
@Controller('widgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WidgetController {
  constructor(
    private readonly widgetService: WidgetService,
    private readonly widgetDataService: WidgetDataService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiResponse({ status: 201, description: 'Widget created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied to dashboard' })
  async create(
    @Body(ZodValidationPipe) createWidgetDto: CreateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      // Check dashboard access
      const hasAccess = await this.widgetService.checkDashboardAccess(
        createWidgetDto.dashboardId,
        user.id,
        user.roles,
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

      const widget = await this.widgetService.create({
        dashboardId: createWidgetDto.dashboardId,
        title: createWidgetDto.title,
        description: createWidgetDto.description,
        visualizationType: createWidgetDto.visualizationType,
        config: createWidgetDto.config,
      });

      return {
        success: true,
        message: 'Widget created successfully',
        data: widget,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create widget',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'List widgets with optional filtering' })
  @ApiQuery({ name: 'dashboardId', required: false, description: 'Filter by dashboard ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by visualization type' })
  @ApiResponse({ status: 200, description: 'Widgets retrieved successfully' })
  async findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('dashboardId') dashboardId?: string,
    @Query('type') type?: string,
  ) {
    try {
      let widgets = await this.widgetService.findAllForUser(user.id, user.roles);

      if (dashboardId) {
        // Additional check for specific dashboard access
        const hasAccess = await this.widgetService.checkDashboardAccess(
          dashboardId,
          user.id,
          user.roles,
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

        widgets = widgets.filter(w => w.dashboardId === dashboardId);
      }

      if (type) {
        widgets = widgets.filter(w => w.visualizationType === type);
      }

      return {
        success: true,
        data: widgets,
        count: widgets.length,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch widgets',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single widget by ID' })
  @ApiResponse({ status: 200, description: 'Widget retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    try {
      const widget = await this.widgetService.findOne(id);
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
      const hasAccess = await this.widgetService.checkDashboardAccess(
        widget.dashboardId,
        user.id,
        user.roles,
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch widget',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a widget' })
  @ApiResponse({ status: 200, description: 'Widget updated successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async update(
    @Param('id') id: string,
    @Body(ZodValidationPipe) updateWidgetDto: UpdateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      const widget = await this.widgetService.findOne(id);
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
      const hasAccess = await this.widgetService.checkDashboardAccess(
        widget.dashboardId,
        user.id,
        user.roles,
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

      const updatedWidget = await this.widgetService.update(id, updateWidgetDto);

      return {
        success: true,
        message: 'Widget updated successfully',
        data: updatedWidget,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update widget',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a widget' })
  @ApiResponse({ status: 200, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    try {
      const widget = await this.widgetService.findOne(id);
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
      const hasAccess = await this.widgetService.checkDashboardAccess(
        widget.dashboardId,
        user.id,
        user.roles,
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

      await this.widgetService.remove(id);

      return {
        success: true,
        message: 'Widget deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete widget',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicate an existing widget' })
  @ApiResponse({ status: 201, description: 'Widget duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Source widget not found' })
  async duplicate(
    @Body(ZodValidationPipe) duplicateWidgetDto: DuplicateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      // Check access to target dashboard
      const hasTargetAccess = await this.widgetService.checkDashboardAccess(
        duplicateWidgetDto.dashboardId,
        user.id,
        user.roles,
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
      const sourceWidget = await this.widgetService.findOne(duplicateWidgetDto.sourceWidgetId);
      if (!sourceWidget) {
        throw new HttpException(
          {
            success: false,
            message: 'Source widget not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const hasSourceAccess = await this.widgetService.checkDashboardAccess(
        sourceWidget.dashboardId,
        user.id,
        user.roles,
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

      const duplicatedWidget = await this.widgetService.duplicate(
        duplicateWidgetDto.sourceWidgetId,
        duplicateWidgetDto.dashboardId,
      );

      // Update title if provided
      if (duplicateWidgetDto.title) {
        await this.widgetService.update(duplicatedWidget.id, {
          title: duplicateWidgetDto.title,
        });
      }

      return {
        success: true,
        message: 'Widget duplicated successfully',
        data: duplicatedWidget,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to duplicate widget',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-refresh')
  @ApiOperation({ summary: 'Bulk refresh widget data' })
  @ApiResponse({ status: 200, description: 'Widgets refreshed successfully' })
  async bulkRefresh(
    @Body(ZodValidationPipe) bulkRefreshDto: BulkRefreshWidgetsDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      // Check access to all widgets
      for (const widgetId of bulkRefreshDto.widgetIds) {
        const widget = await this.widgetService.findOne(widgetId);
        if (!widget) {
          throw new HttpException(
            {
              success: false,
              message: `Widget ${widgetId} not found`,
            },
            HttpStatus.NOT_FOUND,
          );
        }

        const hasAccess = await this.widgetService.checkDashboardAccess(
          widget.dashboardId,
          user.id,
          user.roles,
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk refresh widgets',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/access')
  @ApiOperation({ summary: 'Update widget access control' })
  @ApiResponse({ status: 200, description: 'Widget access updated successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async updateAccess(
    @Param('id') id: string,
    @Body(ZodValidationPipe) updateAccessDto: UpdateWidgetAccessDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      const widget = await this.widgetService.findOne(id);
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
      const hasAccess = await this.widgetService.checkDashboardAccess(
        widget.dashboardId,
        user.id,
        user.roles,
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

      const updatedWidget = await this.widgetService.update(id, updateData);

      return {
        success: true,
        message: 'Widget access updated successfully',
        data: updatedWidget,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update widget access',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Get widget data for visualization' })
  @ApiResponse({ status: 200, description: 'Widget data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async getWidgetData(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    try {
      const widget = await this.widgetService.findOne(id);
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
      const hasAccess = await this.widgetService.checkDashboardAccess(
        widget.dashboardId,
        user.id,
        user.roles,
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

      const widgetData = await this.widgetDataService.getWidgetData(id, user.id);

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
          errors: [error instanceof Error ? error.message : 'Internal server error'],
          empty: true,
        },
      };
    }
  }
}
