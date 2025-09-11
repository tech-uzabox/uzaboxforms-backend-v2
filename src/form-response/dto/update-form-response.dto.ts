
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateFormResponseSchema = z.object({
  responses: z.record(z.string(), z.any()).optional(), // JSON field
});

export class UpdateFormResponseDto extends createZodDto(UpdateFormResponseSchema) {}
