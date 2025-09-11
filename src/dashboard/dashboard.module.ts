import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';
import { WidgetModule } from '../widget/widget.module';

@Module({
  imports: [WidgetModule],
  providers: [DashboardService, DashboardGateway],
  controllers: [DashboardController],
  exports: [DashboardGateway]
})
export class DashboardModule {}
