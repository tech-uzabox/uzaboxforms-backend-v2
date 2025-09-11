import { Module } from '@nestjs/common';
import { ProcessCommentService } from './process-comment.service';
import { ProcessCommentController } from './process-comment.controller';

@Module({
  providers: [ProcessCommentService],
  controllers: [ProcessCommentController]
})
export class ProcessCommentModule {}
