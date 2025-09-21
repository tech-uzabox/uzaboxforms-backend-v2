import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiController, HistoryController],
  providers: [AiService, HistoryService],
  exports: [AiService, HistoryService],
})
export class AiModule {}
