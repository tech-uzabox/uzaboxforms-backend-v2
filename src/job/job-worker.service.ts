import { PgBoss, ProcessQueue } from '@nestjs-enhanced/pg-boss';
import { Injectable, Logger } from '@nestjs/common';
import pgBoss from 'pg-boss';
import { PrismaService } from 'src/db/prisma.service';
import { EmailService } from 'src/email/email.service';
import { FormGenerationService } from 'src/form/form-generation.service';

import { FILE_PROCESSING_JOB, FileProcessingJobPayload, SEND_EMAIL_JOB, SendEmailJobPayload } from './job.service';

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
      const { file, userId, folderId, formId } = job.data;

      this.logger.log(`Processing file: ${file.originalname} for user: ${userId}${formId ? ` (updating form: ${formId})` : ''}`);

      const formSchema = await this.formGenerationService.generateFormSchema(job, {
        buffer: Buffer.from(file.buffer),
        originalname: file.originalname,
      }, userId);

      let targetFormId: string;

      // If formId is provided, update the existing form
      if (formId) {
        // Verify the form exists and belongs to the user
        const existingForm = await this.prisma.form.findUnique({
          where: { id: formId },
        });

        if (!existingForm) {
          throw new Error(`Form with id ${formId} not found`);
        }

        if (existingForm.creatorId !== userId) {
          throw new Error('You do not have permission to update this form');
        }

        // Merge new sections with existing design
        const existingDesign = existingForm.design && Array.isArray(existingForm.design)
          ? existingForm.design
          : [];
        const newSections = formSchema.schema || [];

        // Combine existing sections with new sections
        const mergedDesign = [...existingDesign, ...newSections];

        // Update the existing form
        await this.prisma.form.update({
          where: { id: formId },
          data: {
            design: mergedDesign,
          },
        });

        targetFormId = formId;
        this.logger.log(`Form updated successfully: ${formId}`);
      } else {
        // Create form name
        const formName = file.originalname?.replace(/\.[^/.]+$/, "") || formSchema.name;
        const existingFormByName = await this.prisma.form.findFirst({
          where: { name: formName }
        });

        if (existingFormByName) {
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

        targetFormId = newForm.id;
        this.logger.log(`Form created successfully: ${newForm.id}`);
      }

      // Update progress with formId
      await this.prisma.formGenerationProgress.updateMany({
        where: { jobId: job.id },
        data: { formId: targetFormId },
      });

      return {
        message: "File processed successfully",
        formId: targetFormId,
      };
    } catch (error) {
      await this.prisma.formGenerationProgress.update({
        where: { jobId: job.id },
        data: {
          status: 'FAILED',
          message: error.message
          || 'File processing failed',
        },
      });
      this.logger.error('Error processing file', error);
      // throw error;
    }
  }
}
