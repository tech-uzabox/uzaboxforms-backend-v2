import { Module } from '@nestjs/common';
import { IncomingApplicationService } from './incoming-application.service';
import { IncomingApplicationController } from './incoming-application.controller';

@Module({
  providers: [IncomingApplicationService],
  controllers: [IncomingApplicationController]
})
export class IncomingApplicationModule {}
