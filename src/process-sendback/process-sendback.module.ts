import { Module } from '@nestjs/common';
import { ProcessSendbackService } from './process-sendback.service';
import { ProcessSendbackController } from './process-sendback.controller';

@Module({
  providers: [ProcessSendbackService],
  controllers: [ProcessSendbackController]
})
export class ProcessSendbackModule {}
