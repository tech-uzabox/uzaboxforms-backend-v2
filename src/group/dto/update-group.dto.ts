import { GroupStatus } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateGroupSchema = z.object({
  name: z.string().optional(),
  status: z.nativeEnum(GroupStatus).optional(),
});

export class UpdateGroupDto extends createZodDto(UpdateGroupSchema) {}
