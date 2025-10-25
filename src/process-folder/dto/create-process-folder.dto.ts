import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProcessFolderSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  creatorId: z.string().uuid(),
});

export class CreateProcessFolderDto extends createZodDto(CreateProcessFolderSchema) {}

