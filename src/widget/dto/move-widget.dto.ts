import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MoveWidgetSchema = z.object({
  targetDashboardId: z.string().uuid(),
});

export class MoveWidgetDto extends createZodDto(MoveWidgetSchema) {}
