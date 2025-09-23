import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

@ApiTags('Dashboards')
@Controller('dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  create(
    @Body() createDashboardDto: CreateDashboardDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.dashboardService.create(createDashboardDto, user);
  }

  @Get()
  findAll(@Req() req: { user: AuthenticatedUser }) {
    return this.dashboardService.findAllForUser(req.user.id, req.user.roles);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.dashboardService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDashboardDto: UpdateDashboardDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.dashboardService.update(id, updateDashboardDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.dashboardService.remove(id, user);
  }

  @Put(':id/widget-order')
  updateWidgetOrder(
    @Param('id') id: string,
    @Body() layout: any,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.dashboardService.updateWidgetOrder(id, layout, user);
  }
}
