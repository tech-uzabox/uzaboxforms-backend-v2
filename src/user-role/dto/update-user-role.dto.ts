import { RoleStatus } from 'db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateUserRoleSchema = z.object({
  status: z.nativeEnum(RoleStatus).optional(),
});

export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {}
