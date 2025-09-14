import { z } from 'zod';

export const UpdateAddToDatabaseDtoSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ENABLED', 'DISABLED']).optional(),
  levels: z.array(z.any()).optional(),
}).partial();

export type UpdateAddToDatabaseDto = z.infer<typeof UpdateAddToDatabaseDtoSchema>;
