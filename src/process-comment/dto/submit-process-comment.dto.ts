
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SubmitProcessCommentSchema = z.object({
  applicantProcessId: z.string().uuid(),
  userId: z.string().uuid(),
  comment: z.string(),
});

export class SubmitProcessCommentDto extends createZodDto(SubmitProcessCommentSchema) {}
