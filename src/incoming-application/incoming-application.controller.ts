import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IncomingApplicationService } from './incoming-application.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Incoming Applications')
@Controller('incoming-applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncomingApplicationController {
  constructor(private readonly incomingApplicationService: IncomingApplicationService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending applications for the current user' })
  @ApiResponse({ status: 200, description: 'List of pending applications.' })
  async getPendingApplications(@GetUser() user: AuthenticatedUser) {
    const data = await this.incomingApplicationService.getPendingApplications(user.id, user);
    return { success: true, data };
  }

  @Get('pending/process/:processId')
  @ApiOperation({ summary: 'Get pending applications for a specific process' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiResponse({ status: 200, description: 'List of pending applications for the process.' })
  async getPendingApplicationForProcess(
    @Param('processId') processId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const data = await this.incomingApplicationService.getPendingApplicationForProcess(processId, user.id, user);
    return { success: true, data };
  }

  @Get('single/:applicantProcessId')
  @ApiOperation({ summary: 'Get a single applicant process by ID' })
  @ApiParam({ name: 'applicantProcessId', description: 'ID of the applicant process' })
  @ApiResponse({ status: 200, description: 'Single applicant process details.' })
  @ApiResponse({ status: 404, description: 'Applicant process not found.' })
  async getSingleApplicantProcess(
    @Param('applicantProcessId') applicantProcessId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const data = await this.incomingApplicationService.getSingleApplicantProcess(applicantProcessId, user.id, user);
    return { success: true, data };
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get all completed applications for the current user' })
  @ApiResponse({ status: 200, description: 'List of completed applications.' })
  async getCompletedApplications(@GetUser() user: AuthenticatedUser) {
    const data = await this.incomingApplicationService.getCompletedApplications(user.id, user);
    return { success: true, data };
  }

  @Get('completed/process/:processId')
  @ApiOperation({ summary: 'Get completed forms for a specific process' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiResponse({ status: 200, description: 'List of completed forms for the process.' })
  async getCompletedFormsForProcess(
    @Param('processId') processId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const data = await this.incomingApplicationService.getCompletedFormsForProcess(processId, user.id, user);
    return { success: true, data };
  }

  @Get('completed/single/:applicantProcessId')
  @ApiOperation({ summary: 'Get a single completed applicant process by ID' })
  @ApiParam({ name: 'applicantProcessId', description: 'ID of the applicant process' })
  @ApiResponse({ status: 200, description: 'Single completed applicant process details.' })
  @ApiResponse({ status: 404, description: 'Applicant process not found.' })
  async getCompletedSingleApplicantProcess(
    @Param('applicantProcessId') applicantProcessId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const data = await this.incomingApplicationService.getCompletedSingleApplicantProcess(applicantProcessId, user.id, user);
    return { success: true, data };
  }

  @Get('disabled')
  @ApiOperation({ summary: 'Get all disabled applications for the current user' })
  @ApiResponse({ status: 200, description: 'List of disabled applications.' })
  async getDisabledApplications(@GetUser() user: AuthenticatedUser) {
    const data = await this.incomingApplicationService.getDisabledApplications(user.id, user);
    return { success: true, data };
  }
}