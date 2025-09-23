import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map']),

  // Enhanced multi-metric structure
  metrics: z.array(z.any()).optional(),
  metricMode: z.enum(['aggregation', 'value']).optional().default('aggregation'),
  groupBy: z.any().optional(),
  dateRange: z.any(),
  filters: z.array(z.any()).optional(),

  // Enhanced configuration structure
  configuration: z.any().optional(),

  // Access control (removed but keeping for compatibility)
  allowedUsers: z.array(z.string().uuid()).optional(),
  allowedRoles: z.array(z.string()).optional(),

  // Additional properties
  topN: z.number().int().min(5).max(20).optional(),
  sort: z.enum(['alpha-asc', 'alpha-desc', 'value-asc', 'value-desc', 'time-asc', 'time-desc']).optional(),
  combinationMode: z.string().optional(),
  appearance: z.any().optional(),
  options: z.any().optional(),
  realTime: z.any().optional(),

  // Legacy fields for backward compatibility
  sources: z.array(z.any()).optional(),
  aggregation: z.enum(['count', 'sum', 'mean', 'median', 'mode', 'min', 'max', 'std', 'variance', 'p10', 'p25', 'p50', 'p75', 'p90']).optional(),
  formId: z.string().uuid().optional(),
  valueModeFieldId: z.string().optional(),

  // New config field for processed data
  config: z.any().optional(),
});

export class CreateWidgetDto extends createZodDto(CreateWidgetSchema) {}
