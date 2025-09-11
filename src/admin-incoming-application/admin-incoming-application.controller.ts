import { Controller, Get, Param } from '@nestjs/common';
import { AdminIncomingApplicationService } from './admin-incoming-application.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Incoming Applications')
@Controller('admin-incoming-applications')
export class AdminIncomingApplicationController {
  constructor(private readonly adminIncomingApplicationService: AdminIncomingApplicationService) {}

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

  @Get('by-process/:processId')
  @ApiOperation({ summary: 'Get all applications for a specific process for admin' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiResponse({ status: 200, description: 'List of applications for the process.' })
  async getAllApplicationsForProcess(@Param('processId') processId: string) {
    return this.adminIncomingApplicationService.getAllApplicationsForProcess(processId);
  }
}