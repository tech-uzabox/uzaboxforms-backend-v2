import { z } from 'zod';

export const CreateAddToDatabaseDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['ENABLED', 'DISABLED']).default('ENABLED'),
  parentId: z.string().uuid().optional().nullable(),
});

export type CreateAddToDatabaseDto = z.infer<typeof CreateAddToDatabaseDtoSchema>;
