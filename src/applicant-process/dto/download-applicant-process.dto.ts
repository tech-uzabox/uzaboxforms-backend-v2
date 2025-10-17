import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DownloadApplicantProcessSchema = z.object({
  processId: z.string().uuid(),
  formId: z.string().uuid(),
});

export class DownloadApplicantProcessDto extends createZodDto(DownloadApplicantProcessSchema) {}
