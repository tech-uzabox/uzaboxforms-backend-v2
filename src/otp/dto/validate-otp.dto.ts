
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ValidateOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export class ValidateOtpDto extends createZodDto(ValidateOtpSchema) {}
