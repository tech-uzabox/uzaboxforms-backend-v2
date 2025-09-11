
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateApplicantProcessSchema = z.object({
  applicantId: z.string().uuid(),
  processId: z.string().uuid(),
  formId: z.string().uuid(),
  responses: z.record(z.string(), z.any()),
});

export class CreateApplicantProcessDto extends createZodDto(CreateApplicantProcessSchema) {}
