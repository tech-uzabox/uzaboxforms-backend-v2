import { FormStatus, FormType } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateFormSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(FormType).optional(),
  status: z.nativeEnum(FormStatus).optional(),
  archived: z.boolean().optional(),
  design: z.any().optional(), // Design is JSON
});

export class UpdateFormDto extends createZodDto(UpdateFormSchema) {}
