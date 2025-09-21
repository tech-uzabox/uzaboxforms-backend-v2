import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminIncomingApplicationService } from './admin-incoming-application.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin Incoming Applications')
@Controller('admin-incoming-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'SuperAdmin')
export class AdminIncomingApplicationController {
  constructor(private readonly adminIncomingApplicationService: AdminIncomingApplicationService) {}
  @Get('by-process/:processId')
  @ApiOperation({ summary: 'Get all applications for a specific process for admin' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiResponse({ status: 200, description: 'List of applications for the process.' })
  async getAllApplicationsForProcess(@Param('processId') processId: string, @Query('status') status?: string) {
    const data = await this.adminIncomingApplicationService.getAllApplicationsForProcess(processId, status);
    return { success: true, data };
  }
  @Get(':processId/:applicantProcessId')
  @ApiOperation({ summary: 'Get a single application for admin' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiParam({ name: 'applicantProcessId', description: 'ID of the applicant process' })
  @ApiResponse({ status: 200, description: 'Single application details.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  async getSingleApplication(
    @Param('processId') processId: string,
    @Param('applicantProcessId') applicantProcessId: string,
  ) {
    const data = await this.adminIncomingApplicationService.getSingleApplication(processId, applicantProcessId);
    return { success: true, data };
  }
  @Get('pending')
  @ApiOperation({ summary: 'Get all pending applications for admin' })
  @ApiResponse({ status: 200, description: 'List of pending applications.' })
  async getAllPendingApplications() {
    const data = await this.adminIncomingApplicationService.getAllPendingApplications();
    return { success: true, data };
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get all completed applications for admin' })
  @ApiResponse({ status: 200, description: 'List of completed applications.' })
  async getAllCompletedApplications() {
    const data = await this.adminIncomingApplicationService.getAllCompletedApplications();
    return { success: true, data };
  }

  @Get('disabled')
  @ApiOperation({ summary: 'Get all disabled applications for admin' })
  @ApiResponse({ status: 200, description: 'List of disabled applications.' })
  async getAllDisabledApplications() {
    const data = await this.adminIncomingApplicationService.getAllDisabledApplications();
    return { success: true, data };
  }




}
