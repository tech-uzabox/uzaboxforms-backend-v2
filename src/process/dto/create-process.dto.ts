import { ProcessStatus, ProcessType } from 'db/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProcessSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(ProcessType).default(ProcessType.PRIVATE),
  groupId: z.string().uuid(),
  creatorId: z.string().uuid(),
  status: z.nativeEnum(ProcessStatus).default(ProcessStatus.ENABLED),
  archived: z.boolean().default(false),
  staffViewForms: z.boolean().default(false),
  applicantViewProcessLevel: z.boolean().default(false),
  roles: z.array(z.string().uuid()).optional(),
});

export class CreateProcessDto extends createZodDto(CreateProcessSchema) {}
