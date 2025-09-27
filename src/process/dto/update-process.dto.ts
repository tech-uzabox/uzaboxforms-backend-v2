import { ProcessStatus, ProcessType } from 'db/client';
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
  roles: z.array(z.string().uuid()).optional(),
});

export class UpdateProcessDto extends createZodDto(UpdateProcessSchema) {}
