import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MoveFormSchema = z.object({
  formId: z.string().uuid(),
  targetFolderId: z.string().uuid(),
});

export class MoveFormDto extends createZodDto(MoveFormSchema) {}
