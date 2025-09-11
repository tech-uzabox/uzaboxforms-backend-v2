import { Module } from '@nestjs/common';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { WidgetDataService } from './widget-data.service';

@Module({
  providers: [WidgetService, WidgetDataService],
  controllers: [WidgetController],
  exports: [WidgetDataService]
})
export class WidgetModule {}
