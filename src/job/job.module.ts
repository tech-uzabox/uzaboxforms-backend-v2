import { QueueModule } from '@nestjs-enhanced/pg-boss';
import { forwardRef, Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { FormModule } from 'src/form/form.module';
import { JobWorker } from './job-worker.service';
import { JobService } from './job.service';
@Module({
  imports: [
    QueueModule.register({
      connectionString: process.env.DATABASE_URL,
    }),
    forwardRef(() => EmailModule),
    forwardRef(() => FormModule),
  ],
  providers: [JobService, JobWorker],
  exports: [JobService]
})
export class JobModule {}
