import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../db/prisma.service';
import { BulkRefreshWidgetsDto } from './dto/bulk-refresh-widgets.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { DuplicateWidgetDto } from './dto/duplicate-widget.dto';
import { UpdateWidgetAccessDto } from './dto/update-widget-access.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { WidgetDataService } from './widget-data.service';
import { WidgetService } from './widget.service';

@ApiTags('Widgets')
@Controller('widgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WidgetController {
  constructor(
    private readonly widgetService: WidgetService,
    private readonly widgetDataService: WidgetDataService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('sandbox/:id/data')
  @ApiOperation({ summary: 'Get sandbox widget data for visualization' })
  @ApiResponse({
    status: 200,
    description: 'Sandbox widget data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sandbox widget not found' })
  async getSandboxWidgetData(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.getSandboxWidgetDataForUser(id, user);
  }

  @Get('sandbox/:id')
  @ApiOperation({ summary: 'Get a single sandbox widget by ID' })
  @ApiResponse({
    status: 200,
    description: 'Sandbox widget retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sandbox widget not found' })
  async findOneSandbox(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.findOneSandboxWidget(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiResponse({ status: 201, description: 'Widget created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Access denied to dashboard' })
  async create(
    @Body(ZodValidationPipe) createWidgetDto: CreateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.createWidget(createWidgetDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List widgets with optional filtering' })
  @ApiQuery({
    name: 'dashboardId',
    required: false,
    description: 'Filter by dashboard ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by visualization type',
  })
  @ApiResponse({ status: 200, description: 'Widgets retrieved successfully' })
  async findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('dashboardId') dashboardId?: string,
    @Query('type') type?: string,
  ) {
    return this.widgetService.findAllWidgetsForUser(user, {
      dashboardId,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single widget by ID' })
  @ApiResponse({ status: 200, description: 'Widget retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.widgetService.findOneWidget(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a widget' })
  @ApiResponse({ status: 200, description: 'Widget updated successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async update(
    @Param('id') id: string,
    @Body(ZodValidationPipe) updateWidgetDto: UpdateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.updateWidget(id, updateWidgetDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a widget' })
  @ApiResponse({ status: 200, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.widgetService.removeWidget(id, user);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicate an existing widget' })
  @ApiResponse({ status: 201, description: 'Widget duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Source widget not found' })
  async duplicate(
    @Body(ZodValidationPipe) duplicateWidgetDto: DuplicateWidgetDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.duplicateWidget(duplicateWidgetDto, user);
  }

  @Post('bulk-refresh')
  @ApiOperation({ summary: 'Bulk refresh widget data' })
  @ApiResponse({ status: 200, description: 'Widgets refreshed successfully' })
  async bulkRefresh(
    @Body(ZodValidationPipe) bulkRefreshDto: BulkRefreshWidgetsDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.bulkRefreshWidgets(bulkRefreshDto, user);
  }

  @Put(':id/access')
  @ApiOperation({ summary: 'Update widget access control' })
  @ApiResponse({
    status: 200,
    description: 'Widget access updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async updateAccess(
    @Param('id') id: string,
    @Body(ZodValidationPipe) updateAccessDto: UpdateWidgetAccessDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.updateWidgetAccess(id, updateAccessDto, user);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Get widget data for visualization' })
  @ApiResponse({
    status: 200,
    description: 'Widget data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async getWidgetData(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.widgetService.getWidgetData(id, user);
  }
}
