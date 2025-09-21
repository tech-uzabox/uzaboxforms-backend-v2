import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
  async getAllApplicationsForProcess(@Param('processId') processId: string) {
    return this.adminIncomingApplicationService.getAllApplicationsForProcess(processId);
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
    return this.adminIncomingApplicationService.getSingleApplication(processId, applicantProcessId);
  }
  @Get('pending')
  @ApiOperation({ summary: 'Get all pending applications for admin' })
  @ApiResponse({ status: 200, description: 'List of pending applications.' })
  async getAllPendingApplications() {
    return this.adminIncomingApplicationService.getAllPendingApplications();
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get all completed applications for admin' })
  @ApiResponse({ status: 200, description: 'List of completed applications.' })
  async getAllCompletedApplications() {
    return this.adminIncomingApplicationService.getAllCompletedApplications();
  }

  @Get('disabled')
  @ApiOperation({ summary: 'Get all disabled applications for admin' })
  @ApiResponse({ status: 200, description: 'List of disabled applications.' })
  async getAllDisabledApplications() {
    return this.adminIncomingApplicationService.getAllDisabledApplications();
  }




}
