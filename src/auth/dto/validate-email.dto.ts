import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ValidateEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6),
});

export class ValidateEmailDto extends createZodDto(ValidateEmailSchema) {}
