import { z } from 'zod';

export const CreateAddToDatabaseTreeItemDtoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['ENABLED', 'DISABLED']).default('ENABLED'),
  parentId: z.string().uuid().optional().nullable(),
  addToDatabaseId: z.string().uuid('Invalid add to database ID'),
});

export type CreateAddToDatabaseTreeItemDto = z.infer<typeof CreateAddToDatabaseTreeItemDtoSchema>;



