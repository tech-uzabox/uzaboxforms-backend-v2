
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateGroupRoleSchema = z.object({
  groupId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export class CreateGroupRoleDto extends createZodDto(CreateGroupRoleSchema) {}
