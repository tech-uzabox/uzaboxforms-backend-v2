import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProcessedApplicationSchema = z.object({
  applicantProcessId: z.string().uuid(),
  formId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  responses: z.record(z.string(), z.any()),
});

export class CreateProcessedApplicationDto extends createZodDto(CreateProcessedApplicationSchema) {}