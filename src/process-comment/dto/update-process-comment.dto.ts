
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProcessCommentSchema = z.object({
  comment: z.string().optional(),
});

export class UpdateProcessCommentDto extends createZodDto(UpdateProcessCommentSchema) {}
