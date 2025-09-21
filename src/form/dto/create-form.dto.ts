import { FormStatus, FormType } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateFormSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(FormType).default(FormType.INTERNAL),
  status: z.nativeEnum(FormStatus).default(FormStatus.ENABLED),
  creatorId: z.string().uuid(),
  folderId: z.string().uuid().optional(),
  design: z.any().optional(), // Design is JSON
});

export class CreateFormDto extends createZodDto(CreateFormSchema) {}
