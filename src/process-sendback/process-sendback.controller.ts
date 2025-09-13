import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { ProcessSendbackService } from './process-sendback.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Process Sendback')
@Controller('pending-processes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessSendbackController {
  constructor(private readonly processSendbackService: ProcessSendbackService) {}

  @Patch('sendback/:applicantProcessId')
  async sendback(@Param('applicantProcessId') applicantProcessId: string) {
    return this.processSendbackService.sendback(applicantProcessId);
  }
}
