import { Controller, Post, Body } from '@nestjs/common';
import { ProcessSendbackService } from './process-sendback.service';
import { SendbackDto } from './dto/sendback.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Process Sendback')
@Controller('process-sendback')
export class ProcessSendbackController {
  constructor(private readonly processSendbackService: ProcessSendbackService) {}

  @Post()
  sendback(@Body() sendbackDto: SendbackDto) {
    return this.processSendbackService.sendback(sendbackDto.applicantProcessId);
  }
}