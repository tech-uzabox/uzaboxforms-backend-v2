import { z } from 'zod';

export const CreateAddToDatabaseDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['ENABLED', 'DISABLED']).default('ENABLED'),
  levels: z.array(z.any()).optional().default([]),
});

export type CreateAddToDatabaseDto = z.infer<typeof CreateAddToDatabaseDtoSchema>;
