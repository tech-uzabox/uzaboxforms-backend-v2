import { ProcessStatus } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateApplicantProcessSchema = z.object({
  status: z.nativeEnum(ProcessStatus).optional(),
});

export class UpdateApplicantProcessDto extends createZodDto(
  UpdateApplicantProcessSchema,
) {}
