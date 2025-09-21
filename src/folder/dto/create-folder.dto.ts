import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateFolderSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  creatorId: z.string().uuid(),
});

export class CreateFolderDto extends createZodDto(CreateFolderSchema) {}
