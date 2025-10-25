import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProcessFolderSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export class UpdateProcessFolderDto extends createZodDto(UpdateProcessFolderSchema) {}

