import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map']),
  config: z.any(),
  allowedUsers: z.array(z.string().uuid()).optional(),
  allowedRoles: z.array(z.string()).optional(),
});

export class CreateWidgetDto extends createZodDto(CreateWidgetSchema) {}
