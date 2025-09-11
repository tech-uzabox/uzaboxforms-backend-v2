
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProcessCommentSchema = z.object({
  applicantProcessId: z.string().uuid(),
  userId: z.string().uuid(),
  comment: z.string(),
});

export class CreateProcessCommentDto extends createZodDto(CreateProcessCommentSchema) {}
