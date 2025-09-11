import { RoleStatus } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateGroupRoleSchema = z.object({
  status: z.nativeEnum(RoleStatus).optional(),
});

export class UpdateGroupRoleDto extends createZodDto(UpdateGroupRoleSchema) {}
