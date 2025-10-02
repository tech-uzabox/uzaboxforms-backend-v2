import { PgBoss, ProcessQueue } from '@nestjs-enhanced/pg-boss';
import { Injectable, Logger } from '@nestjs/common';
import pgBoss from 'pg-boss';
import { PrismaService } from 'src/db/prisma.service';
import { EmailService } from 'src/email/email.service';
import { FormGenerationService } from 'src/form/form-generation.service';

import { SEND_EMAIL_JOB, SendEmailJobPayload, FILE_PROCESSING_JOB, FileProcessingJobPayload } from './job.service';

@Injectable()
export class JobWorker {
  public logger = new Logger(JobWorker.name);
  constructor(
    private boss: PgBoss,
    private prisma: PrismaService,
    private emailService: EmailService,
    private formGenerationService: FormGenerationService,
  ) {}
  @ProcessQueue(SEND_EMAIL_JOB)
  async sendEmail(job: pgBoss.Job<SendEmailJobPayload>) {
    try {
      const { to, subject, html } = job.data;
      await this.emailService.sendMail(to, subject, html);
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }

  @ProcessQueue(FILE_PROCESSING_JOB)
  async processFile(job: pgBoss.Job<FileProcessingJobPayload>) {
    try {
      const { file, userId, folderId } = job.data;

      this.logger.log(`Processing file: ${file.originalname} for user: ${userId}`);

      const formSchema = await this.formGenerationService.generateFormSchema(job, {
        buffer: Buffer.from(file.buffer),
        originalname: file.originalname,
      }, userId);

      // Create form name
      const formName = file.originalname?.replace(/\.[^/.]+$/, "") || formSchema.name;
      const existingForm = await this.prisma.form.findFirst({
        where: { name: formName }
      });

      if (existingForm) {
        throw new Error("Form name already exists");
      }

      // Create new form
      const newForm = await this.prisma.form.create({
        data: {
          name: formName,
          status: 'ENABLED',
          creatorId: userId,
          folderId: folderId || null,
          design: formSchema.schema,
        }
      });

      // Update progress with formId
      await this.prisma.formGenerationProgress.updateMany({
        where: { jobId: job.id },
        data: { formId: newForm.id },
      });

      this.logger.log(`Form created successfully: ${newForm.id}`);
      return {
        message: "File processed successfully",
        formId: newForm.id,
        formName: newForm.name,
      };
    } catch (error) {
      this.logger.error('Error processing file', error);
      throw error;
    }
  }
}
