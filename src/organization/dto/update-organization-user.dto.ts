
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateOrganizationUserSchema = z.object({
  title: z.string().optional(),
  superiorId: z.string().uuid().optional(),
});

export class UpdateOrganizationUserDto extends createZodDto(UpdateOrganizationUserSchema) {}
