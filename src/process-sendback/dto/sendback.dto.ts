
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendbackSchema = z.object({
  applicantProcessId: z.string().uuid(),
});

export class SendbackDto extends createZodDto(SendbackSchema) {}
