export interface ProcessedResponse {
  id: string;
  formId: string;
  responses: any;
  createdAt: Date;
  userId?: string;
  processId: string;
  applicantProcessId?: string;
}

export interface GroupedDataBucket {
  responses: ProcessedResponse[];
  metrics: { [metricId: string]: number[] };
  sortValue?: number;
}

export interface GroupedData {
  [groupKey: string]: GroupedDataBucket;
}

export interface SeriesData {
  name: string;
  data?: number[];
  metricId?: string;
  points?: { x: number; y: number }[];
}

export interface WidgetDataPayload {
  type:
    | 'card'
    | 'bar'
    | 'line'
    | 'pie'
    | 'histogram'
    | 'scatter'
    | 'calendar-heatmap'
    | 'map'
    | 'bubble-map'
    | 'flow-map'
    | 'crosstab'
    | 'cct';
  title: string;
  value?: number;
  statLabel?: string;
  categories?: string[];
  x?: string[];
  series?: SeriesData[];
  slices?: { label: string; value: number }[];
  bins?: { label: string }[];
  points?: { x: number; y: number }[];
  values?: { date: string; value: number }[] | (number | string)[][];
  startDate?: string;
  endDate?: string;
  countries?: Record<
    string,
    { values: Record<string, unknown> | Array<Record<string, unknown>>; colorValue?: string }
  >;
  // Bubble map-specific fields
  cities?: Array<{
    country: string;
    city: string;
    value: number;
    latitude?: string;
    longitude?: string;
  }>;
  // Flow map-specific fields
  connections?: Array<{
    city1: string;
    city2: string;
    value: number;
    city1Country: string;
    city2Country: string;
    city1Lat?: number;
    city1Lng?: number;
    city2Lat?: number;
    city2Lng?: number;
  }>;
  primaryCities?: string[];
  // Crosstab-specific fields
  rows?: string[];
  columns?: string[];
  rowTotals?: (number | string)[];
  colTotals?: (number | string)[];
  grandTotal?: number | string;
  // CCT-specific fields
  factors?: string[];
  measures?: { id: string; label: string }[];
  combinations?: string[][];
  meta: any;
  empty: boolean;
  errors?: string[];
}

export interface IWidgetFilter {
  id: string;
  formId: string;
  fieldId?: string;
  systemField?: 'responseId' | 'submissionDate';
  operator: string;
  value: any;
}

export interface IWidgetGroupBy {
  kind: 'none' | 'categorical' | 'time';
  fieldId?: string;
  systemField?: 'responseId' | 'submissionDate';
  timeBucket?:
    | 'year'
    | 'quarter'
    | 'month'
    | 'week'
    | 'day'
    | 'hour'
    | 'minute'
    | 'whole';
  includeMissing?: boolean;
}

export interface IWidgetMetric {
  id: string;
  label: string;
  formId: string;
  fieldId?: string;
  systemField?: 'responseId' | 'submissionDate';
  aggregation?:
    | 'count'
    | 'sum'
    | 'mean'
    | 'median'
    | 'mode'
    | 'min'
    | 'max'
    | 'std'
    | 'variance'
    | 'p10'
    | 'p25'
    | 'p50'
    | 'p75'
    | 'p90';
}

export interface IWidgetSource {
  formId: string;
  fieldId?: string;
  systemField?: 'responseId' | 'submissionDate';
}

export interface IWidgetMapMetric {
  formId: string;
  countryFieldId: string;
  valueFieldId: string;
  label?: string;
}

export interface IWidgetMapAppearance {
  coloringMode?: 'solid' | 'options';
  optionsSource?: {
    formId: string;
    fieldId: string;
    countryFieldId?: string;
  };
  optionColors?: Record<string, string>;
}

export interface IWidgetDateRange {
  preset?:
    | 'all-time'
    | 'custom'
    | 'last-7-days'
    | 'last-30-days'
    | 'last-3-months'
    | 'last-6-months'
    | 'last-12-months'
    | 'all';
  from?: string;
  to?: string;
}

export interface Widget {
  id: string;
  title: string;
  visualizationType: string;
  config: any;
}
