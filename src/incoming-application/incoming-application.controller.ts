import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IncomingApplicationService } from './incoming-application.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Incoming Applications')
@Controller('incoming-applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncomingApplicationController {
  constructor(private readonly incomingApplicationService: IncomingApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications (pending, completed, disabled, processed)' })
  @ApiQuery({ name: 'type', required: true, enum: ['pending', 'completed', 'disabled', 'processed'], description: 'Type of applications to retrieve' })
  @ApiQuery({ name: 'admin', required: false, type: 'string', description: 'Set to "true" for admin view' })
  @ApiResponse({ status: 200, description: 'List of applications.' })
  async getAllApplications(
    @Query('type') type: 'pending' | 'completed' | 'disabled' | 'processed',
    @GetUser() user: AuthenticatedUser,
    @Query('admin') admin?: string
  ) {
    // Check if user has admin roles
    const isAdmin = user.roles?.includes('Admin') || user.roles?.includes('SuperAdmin');
    const isAdminView = admin === 'true' && isAdmin;
    
    const data = await this.incomingApplicationService.getAllApplications(type, user.id, user, isAdminView);
    return { success: true, data };
  }

  @Get('process/:processId')
  @ApiOperation({ summary: 'Get applications for a specific process' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiQuery({ name: 'type', required: true, enum: ['pending', 'completed', 'disabled', 'processed'], description: 'Type of applications to retrieve' })
  @ApiQuery({ name: 'admin', required: false, type: 'string', description: 'Set to "true" for admin view' })
  @ApiQuery({ name: 'status', required: false, type: 'string', description: 'Filter by status (for process-specific queries)' })
  @ApiResponse({ status: 200, description: 'List of applications for the process.' })
  async getApplicationsForProcess(
    @Param('processId') processId: string,
    @Query('type') type: 'pending' | 'completed' | 'disabled' | 'processed',
    @GetUser() user: AuthenticatedUser,
    @Query('admin') admin?: string,
    @Query('status') status?: string
  ) {
    // Check if user has admin roles
    const isAdmin = user.roles?.includes('Admin') || user.roles?.includes('SuperAdmin');
    const isAdminView = admin === 'true' && isAdmin;
    
    const data = await this.incomingApplicationService.getApplicationsForProcess(processId, type, user.id, user, isAdminView, status);
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
        const data = await this.incomingApplicationService.getSingleApplication(applicantProcessId, user.id, user);
    return { success: true, data };
  }
}