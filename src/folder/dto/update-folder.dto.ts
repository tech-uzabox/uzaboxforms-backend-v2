import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateFolderSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export class UpdateFolderDto extends createZodDto(UpdateFolderSchema) {}
