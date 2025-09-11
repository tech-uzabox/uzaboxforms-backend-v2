import { ProcessedResponse, WidgetDataPayload, SeriesData, IWidgetGroupBy } from '../types/widget.types';

export async function processMultiMetricWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const isValueMode = config.metricMode === "value";

  if (isValueMode) {
    const categories: string[] = [];
    const series: SeriesData[] = (config.metrics || []).map((metric: any) => ({
      name: metric.label || `Metric ${metric.id}`,
      data: [],
      metricId: metric.id,
    } as SeriesData));
    const identifierField = config.valueModeFieldId;

    for (const response of filteredResponses) {
      const formDesign = formDesignsMap.get(response.formId);
      let identifier: any;
      if (identifierField) {
        if (identifierField.startsWith("$")) {
          identifier = service.getFieldValue(response, undefined, identifierField.replace("$", "").toLowerCase());
        } else {
          identifier = service.getFieldValue(response, identifierField, undefined, formDesign);
        }
      } else {
        identifier = response._id;
      }

      if (identifier === null || identifier === undefined) continue;

      const category = identifier instanceof Date ? identifier.toISOString() : String(identifier);
      categories.push(category);

      (config.metrics || []).forEach((metric: any, index: number) => {
        let value = 0;
        if (response.formId === metric.formId) {
          const rawValue = service.getFieldValue(response, metric.fieldId, metric.systemField, formDesign);
          const numericValue = toNumber(rawValue);
          if (numericValue !== null) value = numericValue;
        }
        series[index].data!.push(value);
      });
    }

    const payloadType = widget.visualizationType === "bar" ? "bar" : "line";
    return {
      type: payloadType,
      title: widget.title,
      [payloadType === "bar" ? "categories" : "x"]: categories,
      series: series,
      meta: widget.config || {},
      empty: categories.length === 0,
    } as any;
  }

  // Aggregation Mode Logic
  if (!config.metrics || config.metrics.length === 0) {
    return createEmptyPayload(widget);
  }
  const defaultGroupBy: IWidgetGroupBy = { kind: "none" };
  const groupBy = config.groupBy || defaultGroupBy;
  const groupedData = await service.groupResponses(filteredResponses, groupBy);
  const primaryMetric = config.metrics[0];

  const aggMatrix: Record<string, Record<string, number>> = {};
  for (const groupKey of Object.keys(groupedData)) {
    const groupResponses = groupedData[groupKey]?.responses || [];
    aggMatrix[groupKey] = {};
    for (const metric of config.metrics) {
      const formDesign = formDesignsMap.get(metric.formId);
      const aggregationType = metric.aggregation || "count";
      aggMatrix[groupKey][metric.id] = service.calculateAggregation(
        groupResponses,
        aggregationType,
        metric.fieldId,
        metric.systemField,
        formDesign
      );
    }
  }

  let groupKeys = Object.keys(groupedData);
  groupKeys = service.computeSortedGroupKeys(groupKeys, groupedData, config.sort, groupBy, aggMatrix, primaryMetric?.id);
  const finalGroupKeys = config.topN ? groupKeys.slice(0, config.topN) : groupKeys;

  const seriesData: SeriesData[] = config.metrics.map((metric: any) => ({
    name: metric.label || `Metric ${metric.id}`,
    data: finalGroupKeys.map((g) => aggMatrix[g]?.[metric.id] ?? 0),
    metricId: metric.id,
  }));

  if (widget.visualizationType === "bar") {
    return {
      type: "bar",
      title: widget.title,
      categories: finalGroupKeys,
      series: seriesData,
      meta: widget.config || {},
      empty: seriesData.length === 0,
    };
  }
  return {
    type: "line",
    title: widget.title,
    x: finalGroupKeys,
    series: seriesData,
    meta: widget.config || {},
    empty: seriesData.length === 0,
  };
}

export async function processCardWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget);
  }

  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter((r) => r.formId === formId);

  const isValueMode = config.metricMode === "value";
  const aggregationType = metric?.aggregation || config.aggregation || "count";
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  let value: number;
  if (isValueMode && relevantResponses.length > 0) {
    const response = relevantResponses[0];
    const rawValue = service.getFieldValue(response, fieldId, systemField, formDesign);
    const numericValue = toNumber(rawValue);
    value = numericValue !== null ? numericValue : 0;
  } else {
    value = service.calculateAggregation(relevantResponses, aggregationType, fieldId, systemField, formDesign);
  }

  return {
    type: "card",
    title: widget.title,
    value,
    statLabel: aggregationType.toUpperCase(),
    meta: widget.config || {},
    empty: relevantResponses.length === 0,
  };
}

export async function processPieWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const isValueMode = config.metricMode === "value";

  if (isValueMode) {
    const slices: { label: string; value: number }[] = [];
    const metric = config.metrics?.[0];
    if (!metric) return createEmptyPayload(widget) as any;

    const identifierField = config.valueModeFieldId;
    const formDesign = formDesignsMap.get(metric.formId);

    for (const response of filteredResponses) {
      if (response.formId !== metric.formId) continue;

      let label: any;
      if (identifierField) {
        if (identifierField.startsWith("$")) {
          label = service.getFieldValue(response, undefined, identifierField.replace("$", "").toLowerCase());
        } else {
          label = service.getFieldValue(response, identifierField, undefined, formDesign);
        }
      } else {
        label = response._id;
      }

      if (label === null || label === undefined) continue;

      const rawValue = service.getFieldValue(response, metric.fieldId, metric.systemField, formDesign);
      const numericValue = toNumber(rawValue);

      if (numericValue !== null) {
        slices.push({ label: String(label), value: numericValue });
      }
    }

    return {
      type: "pie",
      title: widget.title,
      slices,
      meta: widget.config || {},
      empty: slices.length === 0,
    };
  }

  // Aggregation Mode Logic
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget) as any;
  }
  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter((r) => r.formId === formId);

  if (relevantResponses.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const aggregationType = metric?.aggregation || config.aggregation || "count";
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  let groupBy: IWidgetGroupBy;
  if (config.groupBy) {
    groupBy = config.groupBy;
  } else if (fieldId) {
    groupBy = { kind: "categorical", fieldId };
  } else {
    groupBy = { kind: "none" };
  }

  const groupedData = await service.groupResponses(relevantResponses, groupBy);

  if (groupBy.kind === "none") {
    const value = service.calculateAggregation(relevantResponses, aggregationType, fieldId, systemField, formDesign);
    return {
      type: "pie",
      title: widget.title,
      slices: value > 0 ? [{ label: "All", value }] : [],
      meta: widget.config || {},
      empty: value === 0,
    };
  }

  const slices = Object.entries(groupedData)
    .map(([groupKey, data]: [string, any]) => ({
      label: groupKey,
      value: service.calculateAggregation(data.responses, aggregationType, fieldId, systemField, formDesign),
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  const finalSlices = config.topN ? slices.slice(0, config.topN) : slices;

  return {
    type: "pie",
    title: widget.title,
    slices: finalSlices,
    meta: widget.config || {},
    empty: finalSlices.length === 0,
  };
}

export async function processHistogramWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget) as any;
  }
  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter((r) => r.formId === formId);

  if (relevantResponses.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  const values: number[] = [];
  for (const response of relevantResponses) {
    const value = service.getFieldValue(response, fieldId, systemField, formDesign);
    if (Array.isArray(value)) {
      for (const v of value) {
        const n = toNumber(v);
        if (n !== null) values.push(n);
      }
    } else {
      const n = toNumber(value);
      if (n !== null) values.push(n);
    }
  }

  if (values.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const binningConfig = config.options?.histogram?.binning || { strategy: "auto" };
  let binCount = binningConfig.strategy === "fixed" && binningConfig.bins
    ? Math.max(1, Math.min(50, binningConfig.bins))
    : Math.min(Math.max(Math.ceil(Math.log2(values.length)) + 1, 5), 50);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (maxValue === minValue) {
    return {
      type: "histogram",
      title: widget.title,
      bins: [{ label: `${minValue.toFixed(1)}-${maxValue.toFixed(1)}` }],
      series: [{ name: "Frequency", data: [values.length] }],
      meta: widget.config || {},
      empty: false,
    };
  }

  const binWidth = (maxValue - minValue) / binCount;
  const bins: { label: string; count: number }[] = Array.from(
    { length: binCount },
    (_, i) => {
      const min = minValue + i * binWidth;
      const max = i === binCount - 1 ? maxValue : min + binWidth;
      return { label: `${min.toFixed(1)}-${max.toFixed(1)}`, count: 0 };
    }
  );

  values.forEach((value) => {
    const binIndex = Math.min(Math.floor((value - minValue) / binWidth), binCount - 1);
    bins[binIndex].count++;
  });

  return {
    type: "histogram",
    title: widget.title,
    bins: bins.map((bin) => ({ label: bin.label })),
    series: [{ name: "Frequency", data: bins.map((bin) => bin.count) }],
    meta: widget.config || {},
    empty: false,
  };
}

export async function processScatterWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  if (!config.metrics || config.metrics.length < 2) {
    return createEmptyPayload(widget) as any;
  }

  const xMetric = config.metrics[0];
  const yMetric = config.metrics[1];
  const xFormDesign = formDesignsMap.get(xMetric.formId);
  const yFormDesign = formDesignsMap.get(yMetric.formId);

  const points: { x: number; y: number }[] = [];

  if (xMetric.formId === yMetric.formId) {
    const relevantResponses = filteredResponses.filter((r) => r.formId === xMetric.formId);
    for (const response of relevantResponses) {
      const xValue = service.getFieldValue(response, xMetric.fieldId, xMetric.systemField, xFormDesign);
      const yValue = service.getFieldValue(response, yMetric.fieldId, yMetric.systemField, yFormDesign);
      const xNum = toNumber(xValue);
      const yNum = toNumber(yValue);
      if (xNum !== null && yNum !== null) {
        points.push({ x: xNum, y: yNum });
      }
    }
  } else {
    // Logic for different forms remains complex, might need aggregation or a common key
  }

  if (points.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  return {
    type: "scatter",
    title: widget.title,
    series: [{ name: `${xMetric.label || "X"} vs ${yMetric.label || "Y"}`, points }],
    meta: widget.config || {},
    empty: false,
  };
}

export async function processCalendarHeatmapWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget) as any;
  }
  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter((r) => r.formId === formId);

  if (relevantResponses.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const { startDate, endDate } = resolveDateRange(config.dateRange);
  const dateGroups: { [dateKey: string]: ProcessedResponse[] } = {};

  for (const response of relevantResponses) {
    const dateCandidate = service.getFieldValue(
      response,
      source?.fieldId || metric?.fieldId,
      source?.systemField || metric?.systemField,
      formDesign
    );
    const dateVal = toDate(dateCandidate);
    if (dateVal && dateVal >= startDate && dateVal <= endDate) {
      const dateKey = dateVal.toISOString().slice(0, 10);
      if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
      dateGroups[dateKey].push(response);
    }
  }

  const aggregationType = metric?.aggregation || config.aggregation || "count";
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  const dateValues: { date: string; value: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    const dayResponses = dateGroups[dateKey] || [];
    const value = service.calculateAggregation(dayResponses, aggregationType, fieldId, systemField, formDesign);
    if (value > 0 || config.options?.calendarHeatmap?.showEmptyDates) {
      dateValues.push({ date: dateKey, value });
    }
  }

  return {
    type: "calendar-heatmap",
    title: widget.title,
    values: dateValues,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    meta: widget.config || {},
    empty: dateValues.length === 0,
  };
}

export async function processMapWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any
): Promise<WidgetDataPayload> {
  const mapConfig = config.options?.map || {};
  const metrics: Array<{
    formId: string;
    countryFieldId: string;
    valueFieldId: string;
    label?: string;
  }> = mapConfig.metrics || [];

  if (!metrics || metrics.length === 0) {
    return {
      type: "map",
      title: widget.title,
      countries: {},
      meta: widget.config || {},
      empty: true,
    };
  }

  const latestPerMetric: Array<Record<string, { value: any; createdAt: Date }>> = [];

  for (const metric of metrics) {
    const perCountry: Record<string, { value: any; createdAt: Date }> = {};
    const formIdStr = metric.formId;
    const formDesign = formDesignsMap.get(formIdStr);

    for (const resp of filteredResponses) {
      if (resp.formId !== formIdStr) continue;
      const countryRaw = service.getFieldValue(resp, metric.countryFieldId, undefined, formDesign);
      if (!countryRaw) continue;
      const countryKey = canonicalizeCountryName(String(countryRaw));
      const val = service.getFieldValue(resp, metric.valueFieldId, undefined, formDesign);
      const curr = perCountry[countryKey];
      if (!curr || resp.createdAt > curr.createdAt) {
        perCountry[countryKey] = { value: val, createdAt: resp.createdAt };
      }
    }

    latestPerMetric.push(perCountry);
  }

  const allCountryKeys = new Set<string>();
  latestPerMetric.forEach((m) => Object.keys(m).forEach((k) => allCountryKeys.add(k)));

  const countries: Record<string, { values: Record<string, unknown>; colorValue?: string }> = {};

  for (const country of allCountryKeys) {
    const values: Record<string, unknown> = {};
    metrics.forEach((metric, idx) => {
      const entry = latestPerMetric[idx][country];
      const label = metric.label || metric.valueFieldId;
      values[label] = entry ? entry.value : null;
    });

    countries[country] = { values };
  }

  return {
    type: "map",
    title: widget.title,
    countries,
    meta: widget.config || {},
    empty: Object.keys(countries).length === 0,
  };
}

// Helper functions
function createEmptyPayload(widget: any): WidgetDataPayload {
  const base = {
    title: widget.title,
    meta: widget.config || {},
    empty: true,
  };
  switch (widget.visualizationType) {
    case "card":
      return { ...base, type: "card", value: 0, statLabel: "No Data" };
    case "bar":
      return {
        ...base,
        type: "bar",
        categories: [],
        series: [],
      };
    case "line":
      return { ...base, type: "line", x: [], series: [] };
    case "pie":
      return { ...base, type: "pie", slices: [] };
    case "histogram":
      return { ...base, type: "histogram", bins: [], series: [] };
    case "scatter":
      return { ...base, type: "scatter", series: [] };
    case "calendar-heatmap":
      return {
        ...base,
        type: "calendar-heatmap",
        values: [],
        startDate: "",
        endDate: "",
      };
    default:
      return { ...base, type: "card", value: 0, statLabel: "No Data" };
  }
}

function toNumber(x: any): number | null {
  if (x === null || x === undefined) return null;
  if (x instanceof Date) return x.getTime();
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : null;
}

function toDate(x: any): Date | null {
  if (!x && x !== 0) return null;
  if (x instanceof Date) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

function resolveDateRange(dateRange: any): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date, endDate: Date;
  if (!dateRange || !dateRange.preset) {
    endDate = now;
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }
  if (dateRange.preset === "custom") {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return { startDate: from, endDate: to };
  }
  endDate = now;
  switch (dateRange.preset) {
    case "last-7-days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last-30-days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last-3-months":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "last-6-months":
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case "last-12-months":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate };
}

function canonicalizeCountryName(input: string): string {
  const s = String(input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .trim()
    .toLowerCase();
  const aliases: Record<string, string> = {
    "cote divoire": "cote divoire",
    "cote d ivoire": "cote divoire",
    "ivory coast": "cote divoire",
    "drc": "democratic republic of the congo",
    "dr congo": "democratic republic of the congo",
    "congo kinshasa": "democratic republic of the congo",
    "congo brazzaville": "republic of the congo",
    "cape verde": "cabo verde",
    "eswatini": "eswatini",
    "swaziland": "eswatini",
    "sao tome": "sao tome and principe",
    "sao tome and principe": "sao tome and principe",
    "the gambia": "gambia",
  };
  return aliases[s] || s;
}
