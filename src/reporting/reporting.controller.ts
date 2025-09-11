import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportingService } from './reporting.service';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('processes')
  getProcesses() {
    return this.reportingService.getProcesses();
  }

  @Get('processes/:processId')
  getProcessApplications(@Param('processId') processId: string) {
    return this.reportingService.getProcessApplications(processId);
  }
}
