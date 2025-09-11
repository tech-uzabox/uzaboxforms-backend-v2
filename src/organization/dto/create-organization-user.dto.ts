
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateOrganizationUserSchema = z.object({
  userId: z.string().uuid(),
  title: z.string(),
  superiorId: z.string().uuid().optional(),
});

export class CreateOrganizationUserDto extends createZodDto(CreateOrganizationUserSchema) {}
