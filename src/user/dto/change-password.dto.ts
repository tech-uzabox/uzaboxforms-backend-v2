
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
