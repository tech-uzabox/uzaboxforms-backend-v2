import { GroupStatus } from 'db/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateGroupSchema = z.object({
  name: z.string().optional(),
  status: z.nativeEnum(GroupStatus).optional(),
  roles: z.array(z.string().uuid()).optional(),
});

export class UpdateGroupDto extends createZodDto(UpdateGroupSchema) {}
