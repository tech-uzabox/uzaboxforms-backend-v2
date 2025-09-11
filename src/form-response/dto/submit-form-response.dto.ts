
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SubmitFormResponseSchema = z.object({
  formId: z.string().uuid(),
  applicantProcessId: z.string().uuid(),
  responses: z.record(z.string(), z.any()), // JSON field
});

export class SubmitFormResponseDto extends createZodDto(SubmitFormResponseSchema) {}
