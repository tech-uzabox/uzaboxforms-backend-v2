
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateGroupSchema = z.object({
  name: z.string(),
  creatorId: z.string().uuid(),
});

export class CreateGroupDto extends createZodDto(CreateGroupSchema) {}
