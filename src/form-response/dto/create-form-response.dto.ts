
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateFormResponseSchema = z.object({
  formId: z.string().uuid(),
  applicantProcessId: z.string().uuid(),
  responses: z.record(z.string(), z.any()), // JSON field
});

export class CreateFormResponseDto extends createZodDto(CreateFormResponseSchema) {}
