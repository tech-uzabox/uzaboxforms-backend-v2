import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Crosstab schemas
const CrosstabValueAgg = z.enum([
  'count', 'sum', 'mean', 'median', 'mode', 'min', 'max', 'std', 'variance',
  'p10', 'p25', 'p50', 'p75', 'p90'
]);

const CrosstabCategorySchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().optional(),
  systemField: z.string().optional(),
  includeMissing: z.boolean().optional().default(false),
}).refine(d => !!d.fieldId || !!d.systemField, {
  message: 'Either fieldId or systemField must be provided',
  path: ['field'],
});

const CrosstabValueSchema = z.object({
  formId: z.string().uuid(),
  fieldId: z.string().optional(),
  systemField: z.string().optional(),
  aggregation: CrosstabValueAgg,
}).refine(d => !!d.fieldId || !!d.systemField, {
  message: 'Either fieldId or systemField must be provided',
  path: ['field'],
});

const CrosstabSchema = z.object({
  row: CrosstabCategorySchema,
  column: CrosstabCategorySchema,
  value: CrosstabValueSchema,
  rowAxisTitle: z.string().optional(),
  colAxisTitle: z.string().optional(),
});

const CreateWidgetSchema = z.object({
  dashboardId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  visualizationType: z.enum(['card', 'bar', 'line', 'pie', 'histogram', 'scatter', 'calendar-heatmap', 'map', 'bubble-map', 'group', 'crosstab', 'cct']),

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
}).superRefine((data, ctx) => {
  if (data.visualizationType === 'crosstab') {
    const crosstab = (data.options as any)?.crosstab;
    if (!crosstab) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Crosstab widgets require options.crosstab configuration',
        path: ['options', 'crosstab'],
      });
      return;
    }
    const parsed = CrosstabSchema.safeParse(crosstab);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['options', 'crosstab', ...(issue.path as (string | number)[])],
        });
      }
    }
  }

  if (data.visualizationType === 'cct') {
    const cct = (data.options as any)?.cct;
    if (!cct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CCT widgets require options.cct configuration',
        path: ['options', 'cct'],
      });
      return;
    }

    // Basic CCT validation
    if (!cct.formId || typeof cct.formId !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CCT configuration must include a valid formId',
        path: ['options', 'cct', 'formId'],
      });
    }

    if (!Array.isArray(cct.factors) || cct.factors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CCT configuration must include at least one factor',
        path: ['options', 'cct', 'factors'],
      });
    }

    if (!Array.isArray(cct.measures) || cct.measures.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CCT configuration must include at least one measure',
        path: ['options', 'cct', 'measures'],
      });
    }

    // Validate factors
    if (Array.isArray(cct.factors)) {
      cct.factors.forEach((factor: any, index: number) => {
        if (!factor.fieldId || typeof factor.fieldId !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each factor must have a valid fieldId',
            path: ['options', 'cct', 'factors', index, 'fieldId'],
          });
        }
      });
    }

    // Validate measures
    if (Array.isArray(cct.measures)) {
      cct.measures.forEach((measure: any, index: number) => {
        if (!measure.fieldId || typeof measure.fieldId !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each measure must have a valid fieldId',
            path: ['options', 'cct', 'measures', index, 'fieldId'],
          });
        }
        if (!measure.aggregation || typeof measure.aggregation !== 'string') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Each measure must have a valid aggregation',
            path: ['options', 'cct', 'measures', index, 'aggregation'],
          });
        }
      });
    }
  }
});

export class CreateWidgetDto extends createZodDto(CreateWidgetSchema) {}
