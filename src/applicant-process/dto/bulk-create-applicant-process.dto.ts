import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BulkCreateApplicantProcessSchema = z.object({
  processId: z.string().uuid(),
  formId: z.string().uuid(),
  nextStaffId: z.string().uuid().optional(),
});

export class BulkCreateApplicantProcessDto extends createZodDto(BulkCreateApplicantProcessSchema) {}
