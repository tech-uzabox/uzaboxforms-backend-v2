import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
