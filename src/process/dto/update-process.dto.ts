import { ProcessStatus, ProcessType } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProcessSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(ProcessType).optional(),
  groupId: z.string().uuid().optional(),
  status: z.nativeEnum(ProcessStatus).optional(),
  archived: z.boolean().optional(),
  staffViewForms: z.boolean().optional(),
  applicantViewProcessLevel: z.boolean().optional(),
});

export class UpdateProcessDto extends createZodDto(UpdateProcessSchema) {}
