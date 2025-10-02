import { z } from 'zod';

export const UpdateAddToDatabaseTreeItemDtoSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ENABLED', 'DISABLED']).optional(),
  parentId: z.string().uuid().optional().nullable(),
}).partial();

export type UpdateAddToDatabaseTreeItemDto = z.infer<typeof UpdateAddToDatabaseTreeItemDtoSchema>;



