
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SubmitPublicFormResponseSchema = z.object({
  formId: z.string().uuid(),
  responses: z.record(z.string(), z.any()), // JSON field
});

export class SubmitPublicFormResponseDto extends createZodDto(SubmitPublicFormResponseSchema) {}
