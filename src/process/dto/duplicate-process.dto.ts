
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DuplicateProcessSchema = z.object({
  processId: z.string().uuid(),
});

export class DuplicateProcessDto extends createZodDto(DuplicateProcessSchema) {}
