import { Module } from '@nestjs/common';
import { AdminIncomingApplicationService } from './admin-incoming-application.service';
import { AdminIncomingApplicationController } from './admin-incoming-application.controller';

@Module({
  providers: [AdminIncomingApplicationService],
  controllers: [AdminIncomingApplicationController]
})
export class AdminIncomingApplicationModule {}
