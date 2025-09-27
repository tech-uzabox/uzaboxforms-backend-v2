import { RoleStatus } from 'db/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProcessRoleSchema = z.object({
  status: z.nativeEnum(RoleStatus).optional(),
});

export class UpdateProcessRoleDto extends createZodDto(
  UpdateProcessRoleSchema,
) {}
