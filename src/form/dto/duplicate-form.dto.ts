
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DuplicateFormSchema = z.object({
  formId: z.string().uuid(),
  creatorId: z.string().uuid(),
});

export class DuplicateFormDto extends createZodDto(DuplicateFormSchema) {}
