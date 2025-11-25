import { z } from 'zod';

// ============================================================================
// Enums and Literals
// ============================================================================

export const VisualizationTypeSchema = z.enum([
  'card',
  'bar',
  'line',
  'pie',
  'histogram',
  'scatter',
  'calendar-heatmap',
  'map',
]);

export const AggregationTypeSchema = z.enum([
  'count',
  'sum',
  'mean',
  'median',
  'mode',
  'min',
  'max',
  'std',
  'variance',
  'p10',
  'p25',
  'p50',
  'p75',
  'p90',
]);

export const GroupByKindSchema = z.enum(['none', 'categorical', 'time']);

export const DateGranularitySchema = z.enum([
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'whole',
]);

export const SystemFieldSchema = z.enum(['$responseId$', '$submissionDate$']);

export const MetricModeSchema = z.enum(['aggregation', 'value']);

export const DateRangePresetSchema = z.enum([
  'all-time',
  'last-7-days',
  'last-30-days',
  'last-3-months',
  'last-6-months',
  'last-12-months',
  'custom',
]);

export const BarOrientationSchema = z.enum(['vertical', 'horizontal']);
export const BarCombinationModeSchema = z.enum(['grouped', 'stacked']);
export const LineStyleSchema = z.enum(['solid', 'dashed', 'dotted']);
export const PaletteModeSchema = z.enum(['preset', 'custom']);
export const ColoringModeSchema = z.enum(['solid', 'options']);

export const FilterOperatorSchema = z.enum([
  // Basic
  'equals',
  'not_equals',
  // Numeric
  'greater_than',
  'greater_than_equal',
  'less_than',
  'less_than_equal',
  // Text
  'contains',
  'starts_with',
  'ends_with',
  // List
  'in',
  'not_in',
  // Null
  'is_null',
  'is_not_null',
  // Boolean
  'is_true',
  'is_false',
  // Date
  'date_eq',
  'date_before',
  'date_after',
  'date_range',
]);

// ============================================================================
// Metric Schema
// ============================================================================

export const WidgetMetricAppearanceSchema = z.object({
  color: z.string().optional(),
  lineStyle: LineStyleSchema.optional(),
  barStyle: z.enum(['solid', 'pattern']).optional(),
});

export const WidgetMetricSchema = z.object({
  id: z.string().min(1, 'Metric ID is required'),
  label: z.string().optional(),
  formId: z.string().uuid('Form ID must be a valid UUID'),
  fieldId: z.string().optional(),
  systemField: SystemFieldSchema.optional(),
  aggregation: AggregationTypeSchema.optional(),
  mode: MetricModeSchema.optional(),
  appearance: WidgetMetricAppearanceSchema.optional().default({}),
}).refine(
  (data) => data.fieldId || data.systemField,
  {
    message: 'Either fieldId or systemField must be provided',
    path: ['fieldId'],
  }
);

// ============================================================================
// GroupBy Schema
// ============================================================================

export const WidgetGroupBySchema = z.object({
  kind: GroupByKindSchema,
  fieldId: z.string().optional(),
  systemField: SystemFieldSchema.optional(),
  timeBucket: z.enum(['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'whole']).optional(),
  includeMissing: z.boolean().optional().default(false),
  dateGranularity: DateGranularitySchema.optional(),
}).refine(
  (data) => {
    // If kind is 'categorical' or 'time', must have fieldId or systemField
    if (data.kind === 'categorical' || data.kind === 'time') {
      return data.fieldId || data.systemField;
    }
    return true;
  },
  {
    message: 'fieldId or systemField is required for categorical or time grouping',
    path: ['fieldId'],
  }
).refine(
  (data) => {
    // If kind is 'time', must have dateGranularity
    if (data.kind === 'time') {
      return data.dateGranularity;
    }
    return true;
  },
  {
    message: 'dateGranularity is required for time grouping',
    path: ['dateGranularity'],
  }
);

// ============================================================================
// DateRange Schema
// ============================================================================

export const WidgetDateRangeSchema = z.object({
  preset: DateRangePresetSchema,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => {
    // If preset is 'custom', from and to must be provided
    if (data.preset === 'custom') {
      return data.from && data.to;
    }
    return true;
  },
  {
    message: 'from and to dates are required when preset is "custom"',
    path: ['from'],
  }
);

// ============================================================================
// Filter Schema
// ============================================================================

export const WidgetFilterSchema = z.object({
  id: z.string().min(1, 'Filter ID is required'),
  formId: z.string().uuid('Form ID must be a valid UUID'),
  fieldId: z.string().optional(),
  systemField: SystemFieldSchema.optional(),
  operator: FilterOperatorSchema,
  value: z.any().optional(),
}).refine(
  (data) => data.fieldId || data.systemField,
  {
    message: 'Either fieldId or systemField must be provided',
    path: ['fieldId'],
  }
).refine(
  (data) => {
    // Operators that don't need a value
    const noValueOperators = ['is_null', 'is_not_null', 'is_true', 'is_false'];
    if (noValueOperators.includes(data.operator)) {
      return true;
    }
    // All other operators need a value
    return data.value !== undefined && data.value !== null;
  },
  {
    message: 'value is required for this operator',
    path: ['value'],
  }
);

// ============================================================================
// Appearance Schema
// ============================================================================

export const WidgetAppearanceSchema = z.object({
  backgroundColor: z.string().default('transparent'),
  paletteMode: PaletteModeSchema.default('preset'),
  presetCategoricalPaletteId: z.string().default('default'),
  presetSequentialPaletteId: z.string().optional(),
  customColors: z.array(z.string()).optional(),
  legend: z.boolean().default(true),
  showXAxisLabels: z.boolean().default(true),
  showYAxisLabels: z.boolean().default(true),
  barOrientation: BarOrientationSchema.default('vertical'),
  barCombinationMode: BarCombinationModeSchema.default('grouped'),
  xAxisLabelRotation: z.number().min(-90).max(90).default(0),
  lineStyle: LineStyleSchema.default('solid'),
  showPoints: z.boolean().default(true),
  pointSize: z.number().min(1).max(10).default(3),
  showGrid: z.boolean().default(true),
  gridStyle: LineStyleSchema.default('solid'),
  gridColor: z.string().default('#e5e7eb'),
});

// ============================================================================
// Map-specific Schemas
// ============================================================================

export const MapMetricSchema = z.object({
  label: z.string().optional().default(''),
  formId: z.string().uuid('Form ID must be a valid UUID'),
  countryFieldId: z.string().min(1, 'Country field ID is required'),
  valueFieldId: z.string().min(1, 'Value field ID is required'),
});

export const MapOptionsSourceSchema = z.object({
  formId: z.string().uuid('Form ID must be a valid UUID'),
  fieldId: z.string().min(1, 'Field ID is required'),
  countryFieldId: z.string().min(1, 'Country field ID is required'),
});

export const MapBorderSchema = z.object({
  enabled: z.boolean().default(false),
  color: z.string().default('#ffffff'),
});

export const MapAppearanceSchema = z.object({
  coloringMode: ColoringModeSchema,
  solidColor: z.string().optional(),
  optionsSource: MapOptionsSourceSchema.optional(),
  optionColors: z.record(z.string(), z.string()).optional().default({}),
  border: MapBorderSchema.default({ enabled: false, color: '#ffffff' }),
  showCountryName: z.boolean().default(true),
  showCountryFlag: z.boolean().default(false),
  footerImage: z.string().optional(),
}).refine(
  (data) => {
    // If coloringMode is 'solid', solidColor is required
    if (data.coloringMode === 'solid') {
      return data.solidColor;
    }
    return true;
  },
  {
    message: 'solidColor is required when coloringMode is "solid"',
    path: ['solidColor'],
  }
).refine(
  (data) => {
    // If coloringMode is 'options', optionsSource is required
    if (data.coloringMode === 'options') {
      return data.optionsSource;
    }
    return true;
  },
  {
    message: 'optionsSource is required when coloringMode is "options"',
    path: ['optionsSource'],
  }
);

export const MapOptionsSchema = z.object({
  metrics: z.array(MapMetricSchema).min(1, 'At least one map metric is required'),
  filters: z.array(WidgetFilterSchema).default([]),
  appearance: MapAppearanceSchema,
});

// ============================================================================
// Main Widget Schema
// ============================================================================

export const WidgetConfigSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  visualizationType: VisualizationTypeSchema,
  metricMode: MetricModeSchema.default('aggregation'),
  valueModeFieldId: z.string().optional(),
  metrics: z.array(WidgetMetricSchema).default([]),
  groupBy: WidgetGroupBySchema,
  dateRange: WidgetDateRangeSchema,
  filters: z.array(WidgetFilterSchema).default([]),
  appearance: WidgetAppearanceSchema.default({}),
  options: z.object({
    map: MapOptionsSchema.optional(),
  }).default({}),
})
// Validation refinements for specific widget types
.refine(
  (data) => {
    // Card: max 1 metric, groupBy must be 'none'
    if (data.visualizationType === 'card') {
      return data.metrics.length <= 1 && data.groupBy.kind === 'none';
    }
    return true;
  },
  {
    message: 'Card widgets must have at most 1 metric and groupBy kind must be "none"',
    path: ['visualizationType'],
  }
)
.refine(
  (data) => {
    // Bar: max 5 metrics, groupBy required
    if (data.visualizationType === 'bar') {
      return data.metrics.length <= 5 && data.groupBy.kind !== 'none';
    }
    return true;
  },
  {
    message: 'Bar charts must have at most 5 metrics and require groupBy',
    path: ['visualizationType'],
  }
)
.refine(
  (data) => {
    // Line: max 5 metrics, groupBy must be 'time'
    if (data.visualizationType === 'line') {
      return data.metrics.length <= 5 && data.groupBy.kind === 'time';
    }
    return true;
  },
  {
    message: 'Line charts must have at most 5 metrics and groupBy kind must be "time"',
    path: ['visualizationType'],
  }
)
.refine(
  (data) => {
    // Pie: exactly 1 metric, groupBy must be 'categorical'
    if (data.visualizationType === 'pie') {
      return data.metrics.length === 1 && data.groupBy.kind === 'categorical';
    }
    return true;
  },
  {
    message: 'Pie charts must have exactly 1 metric and groupBy kind must be "categorical"',
    path: ['visualizationType'],
  }
)
.refine(
  (data) => {
    // Map: metrics must be empty, map options must be present
    if (data.visualizationType === 'map') {
      return data.metrics.length === 0 && data.options?.map;
    }
    return true;
  },
  {
    message: 'Map widgets must have empty metrics array and map options configured',
    path: ['visualizationType'],
  }
)
.refine(
  (data) => {
    // Value mode: valueModeFieldId is required
    if (data.metricMode === 'value') {
      return data.valueModeFieldId;
    }
    return true;
  },
  {
    message: 'valueModeFieldId is required when metricMode is "value"',
    path: ['valueModeFieldId'],
  }
)
.refine(
  (data) => {
    // Value mode: metrics should not have aggregation
    if (data.metricMode === 'value') {
      return data.metrics.every(m => !m.aggregation);
    }
    return true;
  },
  {
    message: 'Metrics in value mode should not have aggregation',
    path: ['metrics'],
  }
)
.refine(
  (data) => {
    // Aggregation mode: metrics should have aggregation (except for maps)
    if (data.metricMode === 'aggregation' && data.visualizationType !== 'map') {
      return data.metrics.every(m => m.aggregation);
    }
    return true;
  },
  {
    message: 'Metrics in aggregation mode must have an aggregation type',
    path: ['metrics'],
  }
)
.refine(
  (data) => {
    // Value mode: all metrics must be from the same form
    if (data.metricMode === 'value' && data.metrics.length > 1) {
      const firstFormId = data.metrics[0]?.formId;
      return data.metrics.every(m => m.formId === firstFormId);
    }
    return true;
  },
  {
    message: 'All metrics in value mode must be from the same form',
    path: ['metrics'],
  }
);

// ============================================================================
// Full Widget Schema (with database fields)
// ============================================================================

export const WidgetSchema = z.object({
  dashboardId: z.string().uuid('Dashboard ID must be a valid UUID'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  visualizationType: VisualizationTypeSchema,
  config: WidgetConfigSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type VisualizationType = z.infer<typeof VisualizationTypeSchema>;
export type AggregationType = z.infer<typeof AggregationTypeSchema>;
export type GroupByKind = z.infer<typeof GroupByKindSchema>;
export type DateGranularity = z.infer<typeof DateGranularitySchema>;
export type SystemField = z.infer<typeof SystemFieldSchema>;
export type MetricMode = z.infer<typeof MetricModeSchema>;
export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export type WidgetMetric = z.infer<typeof WidgetMetricSchema>;
export type WidgetGroupBy = z.infer<typeof WidgetGroupBySchema>;
export type WidgetDateRange = z.infer<typeof WidgetDateRangeSchema>;
export type WidgetFilter = z.infer<typeof WidgetFilterSchema>;
export type WidgetAppearance = z.infer<typeof WidgetAppearanceSchema>;
export type MapOptions = z.infer<typeof MapOptionsSchema>;
export type MapMetric = z.infer<typeof MapMetricSchema>;
export type MapAppearance = z.infer<typeof MapAppearanceSchema>;

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export type Widget = z.infer<typeof WidgetSchema>;

// ============================================================================
// Helper Validation Functions
// ============================================================================

/**
 * Validates a widget configuration and returns detailed error messages
 */
export function validateWidgetConfig(config: unknown) {
  const result = WidgetConfigSchema.safeParse(config);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };
  }

  return {
    valid: true,
    data: result.data,
  };
}

/**
 * Validates a full widget (including database fields)
 */
export function validateWidget(widget: unknown) {
  const result = WidgetSchema.safeParse(widget);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    };
  }

  return {
    valid: true,
    data: result.data,
  };
}

/**
 * Validates just the config portion of a widget
 */
export function parseWidgetConfig(config: unknown): WidgetConfig {
  return WidgetConfigSchema.parse(config);
}

/**
 * Validates a full widget
 */
export function parseWidget(widget: unknown): Widget {
  return WidgetSchema.parse(widget);
}
