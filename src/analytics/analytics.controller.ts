import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('form/:processId/:formId')
  @ApiOperation({ summary: 'Get form analytics data' })
  @ApiParam({ name: 'processId', description: 'ID of the process' })
  @ApiParam({ name: 'formId', description: 'ID of the form' })
  @ApiResponse({ status: 200, description: 'Form analytics data.' })
  async getFormAnalyticsData(
    @Param('processId') processId: string,
    @Param('formId') formId: string,
  ) {
    return this.analyticsService.getFormAnalyticsData(processId, formId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get applications analytics data' })
  @ApiResponse({ status: 200, description: 'Applications analytics data.' })
  async getApplicationsAnalytics() {
    return this.analyticsService.getApplicationsAnalytics();
  }

  @Get('processes')
  @ApiOperation({ summary: 'Get process analytics data' })
  @ApiResponse({ status: 200, description: 'Process analytics data.' })
  async getProcessAnalytics() {
    return this.analyticsService.getProcessAnalytics();
  }

  @Get('form-responses')
  @ApiOperation({ summary: 'Get form response analytics data' })
  @ApiResponse({ status: 200, description: 'Form response analytics data.' })
  async getFormResponseAnalytics() {
    return this.analyticsService.getFormResponseAnalytics();
  }

  @Get('monthly-applicant-processes-count')
  @ApiOperation({ summary: 'Get monthly applicant processes count' })
  @ApiResponse({ status: 200, description: 'Monthly applicant processes count.' })
  async getMonthlyApplicantProcessesCount() {
    return this.analyticsService.getMonthlyApplicantProcessesCount();
  }

  @Get('process-distribution')
  @ApiOperation({ summary: 'Get process distribution data' })
  @ApiResponse({ status: 200, description: 'Process distribution data.' })
  async getProcessDistributionData() {
    return this.analyticsService.getProcessDistributionData();
  }
}