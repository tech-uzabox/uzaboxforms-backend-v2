import {
  IWidgetGroupBy,
  ProcessedResponse,
  SeriesData,
  WidgetDataPayload,
} from '../types/widget.types';

export async function processMultiMetricWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any,
): Promise<WidgetDataPayload> {
  const isValueMode = config.metricMode === 'value';

  if (isValueMode) {
    const categories: string[] = [];
    const series: SeriesData[] = (config.metrics || []).map(
      (metric: any) =>
        ({
          name: metric.label || `Metric ${metric.id}`,
          data: [],
          metricId: metric.id,
        }) as SeriesData,
    );
    const identifierField = config.valueModeFieldId;

    for (const response of filteredResponses) {
      const formDesign = formDesignsMap.get(response.formId);
      let identifier: any;
      if (identifierField) {
        if (identifierField.startsWith('$')) {
          identifier = service.getFieldValue(
            response,
            undefined,
            identifierField.replace('$', '').toLowerCase(),
          );
        } else {
          identifier = service.getFieldValue(
            response,
            identifierField,
            undefined,
            formDesign,
          );
        }
      } else {
        identifier = response.id;
      }

      if (identifier === null || identifier === undefined) continue;

      const category =
        identifier instanceof Date
          ? identifier.toISOString()
          : String(identifier);
      categories.push(category);

      (config.metrics || []).forEach((metric: any, index: number) => {
        let value = 0;
        if (response.formId === metric.formId) {
          const rawValue = service.getFieldValue(
            response,
            metric.fieldId,
            metric.systemField,
            formDesign,
          );
          const numericValue = toNumber(rawValue);
          if (numericValue !== null) value = numericValue;
        }
        series[index].data!.push(value);
      });
    }

    const payloadType = widget.visualizationType === 'bar' ? 'bar' : 'line';
    return {
      type: payloadType,
      title: widget.title,
      [payloadType === 'bar' ? 'categories' : 'x']: categories,
      series: series,
      meta: widget.config || {},
      empty: categories.length === 0,
    } as any;
  }

  // Aggregation Mode Logic
  if (!config.metrics || config.metrics.length === 0) {
    return createEmptyPayload(widget);
  }
  const defaultGroupBy: IWidgetGroupBy = { kind: 'none' };
  const groupBy = config.groupBy || defaultGroupBy;
  const groupedData = await service.groupResponses(filteredResponses, groupBy);
  const primaryMetric = config.metrics[0];

  const aggMatrix: Record<string, Record<string, number>> = {};
  for (const groupKey of Object.keys(groupedData)) {
    const groupResponses = groupedData[groupKey]?.responses || [];
    aggMatrix[groupKey] = {};
    for (const metric of config.metrics) {
      const formDesign = formDesignsMap.get(metric.formId);
      const aggregationType = metric.aggregation || 'count';
      aggMatrix[groupKey][metric.id] = service.calculateAggregation(
        groupResponses,
        aggregationType,
        metric.fieldId,
        metric.systemField,
        formDesign,
      );
    }
  }

  let groupKeys = Object.keys(groupedData);
  groupKeys = service.computeSortedGroupKeys(
    groupKeys,
    groupedData,
    config.sort,
    groupBy,
    aggMatrix,
    primaryMetric?.id,
  );
  const finalGroupKeys = config.topN
    ? groupKeys.slice(0, config.topN)
    : groupKeys;

  const seriesData: SeriesData[] = config.metrics.map((metric: any) => ({
    name: metric.label || `Metric ${metric.id}`,
    data: finalGroupKeys.map((g) => aggMatrix[g]?.[metric.id] ?? 0),
    metricId: metric.id,
  }));

  if (widget.visualizationType === 'bar') {
    return {
      type: 'bar',
      title: widget.title,
      categories: finalGroupKeys,
      series: seriesData,
      meta: widget.config || {},
      empty: seriesData.length === 0,
    };
  }
  return {
    type: 'line',
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
  service: any,
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget);
  }

  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter(
    (r) => r.formId === formId,
  );

  const isValueMode = config.metricMode === 'value';
  const aggregationType = metric?.aggregation || config.aggregation || 'count';
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  let value: number;
  if (isValueMode && relevantResponses.length > 0) {
    const response = relevantResponses[0];
    const rawValue = service.getFieldValue(
      response,
      fieldId,
      systemField,
      formDesign,
    );
    const numericValue = toNumber(rawValue);
    value = numericValue !== null ? numericValue : 0;
  } else {
    value = service.calculateAggregation(
      relevantResponses,
      aggregationType,
      fieldId,
      systemField,
      formDesign,
    );
  }

  return {
    type: 'card',
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
  service: any,
): Promise<WidgetDataPayload> {
  const isValueMode = config.metricMode === 'value';

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
        if (identifierField.startsWith('$')) {
          label = service.getFieldValue(
            response,
            undefined,
            identifierField.replace('$', '').toLowerCase(),
          );
        } else {
          label = service.getFieldValue(
            response,
            identifierField,
            undefined,
            formDesign,
          );
        }
      } else {
        label = response.id;
      }

      if (label === null || label === undefined) continue;

      const rawValue = service.getFieldValue(
        response,
        metric.fieldId,
        metric.systemField,
        formDesign,
      );
      const numericValue = toNumber(rawValue);

      if (numericValue !== null) {
        slices.push({ label: String(label), value: numericValue });
      }
    }

    return {
      type: 'pie',
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
  const relevantResponses = filteredResponses.filter(
    (r) => r.formId === formId,
  );

  if (relevantResponses.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const aggregationType = metric?.aggregation || config.aggregation || 'count';
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  let groupBy: IWidgetGroupBy;
  if (config.groupBy) {
    groupBy = config.groupBy;
  } else if (fieldId) {
    groupBy = { kind: 'categorical', fieldId };
  } else {
    groupBy = { kind: 'none' };
  }

  const groupedData = await service.groupResponses(relevantResponses, groupBy);

  if (groupBy.kind === 'none') {
    const value = service.calculateAggregation(
      relevantResponses,
      aggregationType,
      fieldId,
      systemField,
      formDesign,
    );
    return {
      type: 'pie',
      title: widget.title,
      slices: value > 0 ? [{ label: 'All', value }] : [],
      meta: widget.config || {},
      empty: value === 0,
    };
  }

  const slices = Object.entries(groupedData)
    .map(([groupKey, data]: [string, any]) => ({
      label: groupKey,
      value: service.calculateAggregation(
        data.responses,
        aggregationType,
        fieldId,
        systemField,
        formDesign,
      ),
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  const finalSlices = config.topN ? slices.slice(0, config.topN) : slices;

  return {
    type: 'pie',
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
  service: any,
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget) as any;
  }
  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter(
    (r) => r.formId === formId,
  );

  if (relevantResponses.length === 0) {
    return createEmptyPayload(widget) as any;
  }

  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  const values: number[] = [];
  for (const response of relevantResponses) {
    const value = service.getFieldValue(
      response,
      fieldId,
      systemField,
      formDesign,
    );
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

  const binningConfig = config.options?.histogram?.binning || {
    strategy: 'auto',
  };
  let binCount =
    binningConfig.strategy === 'fixed' && binningConfig.bins
      ? Math.max(1, Math.min(50, binningConfig.bins))
      : Math.min(Math.max(Math.ceil(Math.log2(values.length)) + 1, 5), 50);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (maxValue === minValue) {
    return {
      type: 'histogram',
      title: widget.title,
      bins: [{ label: `${minValue.toFixed(1)}-${maxValue.toFixed(1)}` }],
      series: [{ name: 'Frequency', data: [values.length] }],
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
    },
  );

  values.forEach((value) => {
    const binIndex = Math.min(
      Math.floor((value - minValue) / binWidth),
      binCount - 1,
    );
    bins[binIndex].count++;
  });

  return {
    type: 'histogram',
    title: widget.title,
    bins: bins.map((bin) => ({ label: bin.label })),
    series: [{ name: 'Frequency', data: bins.map((bin) => bin.count) }],
    meta: widget.config || {},
    empty: false,
  };
}

export async function processScatterWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any,
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
    const relevantResponses = filteredResponses.filter(
      (r) => r.formId === xMetric.formId,
    );
    for (const response of relevantResponses) {
      const xValue = service.getFieldValue(
        response,
        xMetric.fieldId,
        xMetric.systemField,
        xFormDesign,
      );
      const yValue = service.getFieldValue(
        response,
        yMetric.fieldId,
        yMetric.systemField,
        yFormDesign,
      );
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
    type: 'scatter',
    title: widget.title,
    series: [
      { name: `${xMetric.label || 'X'} vs ${yMetric.label || 'Y'}`, points },
    ],
    meta: widget.config || {},
    empty: false,
  };
}

export async function processCalendarHeatmapWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any,
): Promise<WidgetDataPayload> {
  const source = config.sources?.[0];
  const metric = config.metrics?.[0];

  if (!source && !metric) {
    return createEmptyPayload(widget) as any;
  }
  const formId = source?.formId || metric!.formId;
  const formDesign = formDesignsMap.get(formId);
  const relevantResponses = filteredResponses.filter(
    (r) => r.formId === formId,
  );

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
      formDesign,
    );
    const dateVal = toDate(dateCandidate);
    if (dateVal && dateVal >= startDate && dateVal <= endDate) {
      const dateKey = dateVal.toISOString().slice(0, 10);
      if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
      dateGroups[dateKey].push(response);
    }
  }

  const aggregationType = metric?.aggregation || config.aggregation || 'count';
  const fieldId = metric?.fieldId || source?.fieldId;
  const systemField = metric?.systemField || source?.systemField;

  const dateValues: { date: string; value: number }[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    const dayResponses = dateGroups[dateKey] || [];
    const value = service.calculateAggregation(
      dayResponses,
      aggregationType,
      fieldId,
      systemField,
      formDesign,
    );
    if (value > 0 || config.options?.calendarHeatmap?.showEmptyDates) {
      dateValues.push({ date: dateKey, value });
    }
  }

  return {
    type: 'calendar-heatmap',
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
  service: any,
): Promise<WidgetDataPayload> {
  console.log("Processing map widget with responses:", filteredResponses.length);
  const mapConfig = config.options?.map || {};
  const metrics: Array<{
    formId: string;
    countryFieldId: string;
    valueFieldId: string;
    label?: string;
  }> = mapConfig.metrics || [];
  const appearance = mapConfig.appearance || {};
  const coloringMode = appearance.coloringMode || "solid";
  const optionsSource = appearance.optionsSource || null;
  const optionColors: Record<string, string> = appearance.optionColors || {};

  console.log("Map config:", { coloringMode, optionsSource, metricsCount: metrics.length });

  const normalizedOptionColors: Record<string, string> = Object.fromEntries(
    Object.entries(optionColors).map(([k, v]) => [normalizeScalarForCompare(k), v])
  );

  if (!metrics || metrics.length === 0) {
    return {
      type: 'map',
      title: widget.title,
      countries: {},
      meta: widget.config || {},
      empty: true,
    };
  }

  // Check if all metrics share the same formId
  const sameFormId = metrics.length > 0 ? String(metrics[0].formId) : null;
  const sameForm = metrics.every(m => String(m.formId) === sameFormId);

  const countries: Record<
    string,
    { values: Record<string, unknown> | Array<Record<string, unknown>>; colorValue?: string }
  > = {};

  if (sameForm && sameFormId) {
    // Collect responses per country for the shared form
    const countryResponses: Record<string, ProcessedResponse[]> = {};
    const formDesign = formDesignsMap.get(sameFormId);

    for (const resp of filteredResponses) {
      if (resp.formId !== sameFormId) continue;
      const countryRaw = service.getFieldValue(
        resp,
        metrics[0].countryFieldId,
        undefined,
        formDesign,
      );
      if (!countryRaw) continue;
      const countryKey = canonicalizeCountryName(String(countryRaw));
      if (!countryResponses[countryKey]) {
        countryResponses[countryKey] = [];
      }
      countryResponses[countryKey].push(resp);
    }

    // Sort responses per country by createdAt desc
    for (const country in countryResponses) {
      countryResponses[country].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Build values for each country
    for (const country in countryResponses) {
      const responses = countryResponses[country];
      if (responses.length > 1) {
        // Build table rows
        const rows: Array<Record<string, unknown>> = [];
        for (const resp of responses) {
          const row: Record<string, unknown> = {};
          metrics.forEach((metric) => {
            const question = getQuestion(formDesign, metric.valueFieldId);
            const label = metric.label || question?.label || metric.valueFieldId;
            const val = service.getFieldValue(
              resp,
              metric.valueFieldId,
              undefined,
              formDesign,
            );
            row[label] = val;
          });
          rows.push(row);
        }
        countries[country] = { values: rows };
      } else {
        // Single response: build single record
        const values: Record<string, unknown> = {};
        metrics.forEach((metric) => {
          const question = getQuestion(formDesign, metric.valueFieldId);
          const label = metric.label || question?.label || metric.valueFieldId;
          const val = service.getFieldValue(
            responses[0],
            metric.valueFieldId,
            undefined,
            formDesign,
          );
          values[label] = val;
        });
        countries[country] = { values };
      }
    }
  } else {
    // Fallback to original logic when metrics do not share the same formId
    const latestPerMetric: Array<
      Record<string, { value: any; createdAt: Date }>
    > = [];

    for (const metric of metrics) {
      const perCountry: Record<string, { value: any; createdAt: Date }> = {};
      const formIdStr = String(metric.formId);
      const formDesign = formDesignsMap.get(formIdStr);

      for (const resp of filteredResponses) {
        if (resp.formId !== formIdStr) continue;
        const countryRaw = service.getFieldValue(
          resp,
          metric.countryFieldId,
          undefined,
          formDesign,
        );
        if (!countryRaw) continue;
        const countryKey = canonicalizeCountryName(String(countryRaw));
        const val = service.getFieldValue(
          resp,
          metric.valueFieldId,
          undefined,
          formDesign,
        );
        const curr = perCountry[countryKey];
        if (!curr || resp.createdAt > curr.createdAt) {
          perCountry[countryKey] = { value: val, createdAt: resp.createdAt };
        }
      }

      latestPerMetric.push(perCountry);
    }

    const allCountryKeys = new Set<string>();
    latestPerMetric.forEach((m) =>
      Object.keys(m).forEach((k) => allCountryKeys.add(k)),
    );

    for (const country of allCountryKeys) {
      const values: Record<string, unknown> = {};
      metrics.forEach((metric, idx) => {
        const entry = latestPerMetric[idx][country];
        const formDesign = formDesignsMap.get(String(metric.formId));
        const question = getQuestion(formDesign, metric.valueFieldId);
        const label = metric.label || question?.label || metric.valueFieldId;
        values[label] = entry ? entry.value : null;
      });

      countries[country] = { values };
    }
  }

  // Compute colorValue for all countries (preserved logic)
  for (const country in countries) {
    let colorValue: string | undefined = undefined;
    if (coloringMode === "options" && optionsSource) {
      console.log(`Processing options coloring for country: ${country}`);
      // Determine the country field to use for the options source form
      const srcFormIdStr = String(optionsSource.formId);
      const formDesign = formDesignsMap.get(srcFormIdStr);
      const srcCountryFieldId =
        optionsSource.countryFieldId ||
        (metrics.find((m) => String(m.formId) === srcFormIdStr)?.countryFieldId);

      console.log(`Options source config:`, { srcFormIdStr, srcCountryFieldId, fieldId: optionsSource.fieldId });

      let latest: { value: any; createdAt: Date } | null = null;
      if (srcCountryFieldId) {
        for (const resp of filteredResponses) {
          if (resp.formId !== srcFormIdStr) continue;
          const countryRaw = service.getFieldValue(
            resp,
            srcCountryFieldId,
            undefined,
            formDesign,
          );
          if (!countryRaw) continue;
          const key = canonicalizeCountryName(String(countryRaw));
          if (key !== country) continue;
          const optVal = service.getFieldValue(
            resp,
            optionsSource.fieldId,
            undefined,
            formDesign,
          );
          console.log(`Found option value for ${country}:`, optVal);
          if (!latest || resp.createdAt > latest.createdAt) {
            latest = { value: optVal, createdAt: resp.createdAt };
          }
        }
      }
      if (latest && latest.value != null) {
        const k = normalizeScalarForCompare(latest.value);
        colorValue = normalizedOptionColors[k] || undefined;
        console.log(`Assigned color for ${country}:`, { optionKey: k, colorValue });
      }
    }

    countries[country].colorValue = colorValue;
  }

  console.log(`Map widget processing complete. Countries processed: ${Object.keys(countries).length}`);

  // Determine region from country question's countryLevel
  let region: string | undefined;
  for (const metric of metrics) {
    const formDesign = formDesignsMap.get(String(metric.formId));
    const countryQuestion = getQuestion(formDesign, metric.countryFieldId);
    if (countryQuestion?.countryLevel) {
      region = countryQuestion.countryLevel;
      break;
    }
  }

  const meta = { ...widget.config };
  if (region) {
    meta.options = meta.options || {};
    meta.options.map = meta.options.map || {};
    meta.options.map.region = region;
  }

  return {
    type: 'map',
    title: widget.title,
    countries,
    meta,
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
    case 'card':
      return { ...base, type: 'card', value: 0, statLabel: 'No Data' };
    case 'bar':
      return {
        ...base,
        type: 'bar',
        categories: [],
        series: [],
      };
    case 'line':
      return { ...base, type: 'line', x: [], series: [] };
    case 'pie':
      return { ...base, type: 'pie', slices: [] };
    case 'histogram':
      return { ...base, type: 'histogram', bins: [], series: [] };
    case 'scatter':
      return { ...base, type: 'scatter', series: [] };
    case 'calendar-heatmap':
      return {
        ...base,
        type: 'calendar-heatmap',
        values: [],
        startDate: '',
        endDate: '',
      };
    case 'crosstab':
      return {
        ...base,
        type: 'crosstab',
        rows: [],
        columns: [],
        values: [],
      };
    case 'map':
      return {
        ...base,
        type: 'map',
        countries: {},
      };
    default:
      return { ...base, type: 'card', value: 0, statLabel: 'No Data' };
  }
}

function toNumber(x: any): number | null {
  if (x === null || x === undefined) return null;
  if (x instanceof Date) return x.getTime();
  const n = typeof x === 'number' ? x : parseFloat(String(x));
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
  if (dateRange.preset === 'custom') {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return { startDate: from, endDate: to };
  }
  endDate = now;
  switch (dateRange.preset) {
    case 'last-7-days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last-30-days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last-3-months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'last-6-months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'last-12-months':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate };
}

function canonicalizeCountryName(input: string): string {
  const s = String(input || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .trim()
    .toLowerCase();
  const aliases: Record<string, string> = {
    'cote divoire': 'cote divoire',
    'cote d ivoire': 'cote divoire',
    'ivory coast': 'cote divoire',
    drc: 'democratic republic of the congo',
    'dr congo': 'democratic republic of the congo',
    'congo kinshasa': 'democratic republic of the congo',
    'congo brazzaville': 'republic of the congo',
    'cape verde': 'cabo verde',
    eswatini: 'eswatini',
    swaziland: 'eswatini',
    'sao tome': 'sao tome and principe',
    'sao tome and principe': 'sao tome and principe',
    'the gambia': 'gambia',
  };
  return aliases[s] || s;
}

function normalizeScalarForCompare(x: any): string {
  if (x === null || x === undefined) return "";
  if (x instanceof Date) return x.toISOString();
  if (typeof x === "boolean") return x ? "true" : "false";
  if (typeof x === "number") return x.toString();
  return String(x).trim().toLowerCase();
}

function getQuestion(formDesign: any, fieldId: string): any {
  if (!formDesign) return null;
  for (const section of formDesign) {
    if (section.questions && Array.isArray(section.questions)) {
      const question = section.questions.find((q: any) => q.id === fieldId);
      if (question) return question;
    }
  }
  return null;
}

export async function processCCTWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any,
): Promise<WidgetDataPayload> {
  console.log('processCCTWidget: Starting with', filteredResponses.length, 'responses');
  const cct = config.options?.cct || config.cct;
  if (!cct) {
    console.log('processCCTWidget: No CCT config found');
    return createEmptyPayload(widget) as any;
  }

  const { formId, factors, measures } = cct;
  console.log('processCCTWidget: Config - formId:', formId, 'factors:', factors, 'measures:', measures);

  if (!factors || factors.length === 0 || !measures || measures.length === 0) {
    console.log('processCCTWidget: Missing factors or measures');
    return createEmptyPayload(widget) as any;
  }

  const formDesign = formDesignsMap.get(String(formId));
  if (!formDesign) {
    console.log('processCCTWidget: Form design not found for formId:', formId);
    return createEmptyPayload(widget) as any;
  }

  // Get distinct factor values
  const factorValuesMap = new Map<string, Set<string>>();
  for (const factor of factors) {
    const values = new Set<string>();
    for (const response of filteredResponses) {
      if (String(response.formId) !== String(formId)) continue;
      const value = service.getFieldValue(response, factor.fieldId, undefined, formDesign);
      if (value !== null && value !== undefined) {
        values.add(String(value));
      }
    }
    factorValuesMap.set(factor.fieldId, values);
    console.log('processCCTWidget: Factor', factor.fieldId, 'has', values.size, 'distinct values:', Array.from(values));
  }

  // Check if we have any factor values
  const hasFactorValues = Array.from(factorValuesMap.values()).some(set => set.size > 0);
  if (!hasFactorValues) {
    console.log('processCCTWidget: No factor values found, returning empty');
    return createEmptyPayload(widget) as any;
  }

  // Generate Cartesian product of factor combinations
  const factorLists = factors.map(f => Array.from(factorValuesMap.get(f.fieldId) || []));
  const combinations = cartesianProduct(factorLists) as string[][];
  console.log('processCCTWidget: Generated', combinations.length, 'combinations from factors:', factorLists.map(list => list.length));

  console.log('processCCTWidget: Generated', combinations.length, 'combinations');

  // Group responses by factor combination and compute aggregations
  const combinationMap = new Map<string, Map<string, number[]>>();
  const factorKeys = factors.map(f => f.fieldId);

  for (const response of filteredResponses) {
    if (String(response.formId) !== String(formId)) continue;

    // Get factor values for this response
    const factorCombo = factorKeys.map(key => {
      const value = service.getFieldValue(response, key, undefined, formDesign);
      return value !== null && value !== undefined ? String(value) : null;
    });

    // Skip if any factor is missing
    if (factorCombo.some(v => v === null)) continue;

    const comboKey = factorCombo.join('|');

    // Initialize measure aggregations for this combination
    if (!combinationMap.has(comboKey)) {
      combinationMap.set(comboKey, new Map());
    }
    const measureMap = combinationMap.get(comboKey)!;

    // Compute each measure
    for (const measure of measures) {
      const measureKey = `${measure.fieldId}:${measure.aggregation}`;
      if (!measureMap.has(measureKey)) {
        measureMap.set(measureKey, []);
      }
      const values = measureMap.get(measureKey)!;

      if (measure.aggregation === 'count') {
        values.push(1);
      } else {
        const rawValue = service.getFieldValue(response, measure.fieldId, undefined, formDesign);
        const numericValue = toNumber(rawValue);
        if (numericValue !== null) {
          values.push(numericValue);
        }
      }
    }
  }

  // Build final data structure
  const resultCombinations: string[][] = [];
  const resultValues: (number | null)[][] = [];

  for (const combo of combinations) {
    const comboKey = combo.join('|');
    const measureMap = combinationMap.get(comboKey);

    resultCombinations.push(combo);

    const measureValues: (number | null)[] = [];
    for (const measure of measures) {
      const measureKey = `${measure.fieldId}:${measure.aggregation}`;
      if (measureMap && measureMap.has(measureKey)) {
        const values = measureMap.get(measureKey)!;
        if (values.length === 0) {
          measureValues.push(null);
        } else {
          // Apply aggregation
          let aggregatedValue: number;
          switch (measure.aggregation) {
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'sum':
              aggregatedValue = values.reduce((a, b) => a + b, 0);
              break;
            case 'mean':
              aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case 'median':
              const sorted = [...values].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              aggregatedValue = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
              break;
            case 'mode':
              const freq: Record<number, number> = {};
              values.forEach(v => freq[v] = (freq[v] || 0) + 1);
              const maxFreq = Math.max(...Object.values(freq));
              const modes = Object.keys(freq).filter(k => freq[Number(k)] === maxFreq).map(Number);
              aggregatedValue = modes[0]; // Take first mode
              break;
            case 'min':
              aggregatedValue = Math.min(...values);
              break;
            case 'max':
              aggregatedValue = Math.max(...values);
              break;
            case 'std':
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
              aggregatedValue = Math.sqrt(variance);
              break;
            case 'variance':
              const mean2 = values.reduce((a, b) => a + b, 0) / values.length;
              aggregatedValue = values.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / values.length;
              break;
            case 'p10':
              const sorted10 = [...values].sort((a, b) => a - b);
              const idx10 = Math.floor(sorted10.length * 0.1);
              aggregatedValue = sorted10[Math.max(0, idx10)];
              break;
            case 'p25':
              const sorted25 = [...values].sort((a, b) => a - b);
              const idx25 = Math.floor(sorted25.length * 0.25);
              aggregatedValue = sorted25[Math.max(0, idx25)];
              break;
            case 'p50':
              const sorted50 = [...values].sort((a, b) => a - b);
              const idx50 = Math.floor(sorted50.length * 0.5);
              aggregatedValue = sorted50[Math.max(0, idx50)];
              break;
            case 'p75':
              const sorted75 = [...values].sort((a, b) => a - b);
              const idx75 = Math.floor(sorted75.length * 0.75);
              aggregatedValue = sorted75[Math.max(0, idx75)];
              break;
            case 'p90':
              const sorted90 = [...values].sort((a, b) => a - b);
              const idx90 = Math.floor(sorted90.length * 0.9);
              aggregatedValue = sorted90[Math.max(0, idx90)];
              break;
            default:
              aggregatedValue = values.reduce((a, b) => a + b, 0); // Default to sum
          }
          measureValues.push(aggregatedValue);
        }
      } else {
        measureValues.push(null);
      }
    }
    resultValues.push(measureValues);
  }

  const factorLabels = factors.map(f => {
    const question = getQuestion(formDesign, f.fieldId);
    return f.label || question?.label || f.fieldId;
  });
  const measureLabels = measures.map(m => {
    const question = getQuestion(formDesign, m.fieldId);
    const questionLabel = question?.label || m.fieldId;
    return { id: `${m.fieldId}:${m.aggregation}`, label: m.label || `${questionLabel}` };
  });

  console.log('processCCTWidget: Returning data - combinations:', resultCombinations.length, 'measures:', measureLabels.length);

  return {
    type: 'cct',
    title: widget.title,
    factors: factorLabels,
    measures: measureLabels,
    combinations: resultCombinations,
    values: resultValues as (string | number)[][],
    meta: widget.config || {},
    empty: resultCombinations.length === 0,
  } as WidgetDataPayload;
}

// Helper function for Cartesian product
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);

  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);

  const result: T[][] = [];
  for (const item of first) {
    for (const combo of restProduct) {
      result.push([item, ...combo]);
    }
  }
  return result;
}

export async function processCrossTabWidget(
  widget: any,
  filteredResponses: ProcessedResponse[],
  formDesignsMap: Map<string, any>,
  config: any,
  service: any,
): Promise<WidgetDataPayload> {
  console.log('processCrossTabWidget: Starting with', filteredResponses.length, 'responses');
  const cx = config.options?.crosstab || config.crosstab;
  if (!cx) {
    console.log('processCrossTabWidget: No crosstab config found');
    return createEmptyPayload(widget) as any;
  }

  const { row, column, value } = cx;
  console.log('processCrossTabWidget: Config - row:', row, 'column:', column, 'value:', value);
  const rowFD = formDesignsMap.get(String(row.formId));
  const colFD = formDesignsMap.get(String(column.formId));
  const valFD = formDesignsMap.get(String(value.formId));
  console.log('processCrossTabWidget: Form designs found - rowFD:', !!rowFD, 'colFD:', !!colFD, 'valFD:', !!valFD);

  const MISSING = 'Missing';

  // Debug helper to extract questionIds seen in a response payload (array/object shapes)
  const extractQuestionIdsFromResponse = (resp: any): string[] => {
    try {
      const ids = new Set<string>();
      let rr: any = resp?.responses ?? resp;
      if (typeof rr === 'string') {
        try { rr = JSON.parse(rr); } catch { /* ignore */ }
      }
      const walk = (node: any, depth = 0) => {
        if (!node || depth > 6) return;
        if (Array.isArray(node)) {
          for (const item of node) walk(item, depth + 1);
          return;
        }
        if (typeof node === 'object') {
          if (Array.isArray((node as any).responses)) {
            for (const qr of (node as any).responses) {
              const qid = qr?.questionId ?? qr?.id;
              if (qid) ids.add(String(qid));
            }
          }
          for (const k of Object.keys(node)) {
            if (k !== 'responses') {
              if (k.startsWith('question-')) ids.add(k);
              walk((node as any)[k], depth + 1);
            }
          }
        }
      };
      walk(rr);
      return Array.from(ids).slice(0, 50);
    } catch {
      return [];
    }
  };

  // Helpers to fallback-resolve values by axis title (label-based) when fieldId mismatches
  const normText = (s: any): string => String(s ?? '').trim().toLowerCase();
  const extractByLabel = (resp: any, targetLabel?: string): any => {
    if (!targetLabel) return null;
    let rr: any = resp?.responses ?? resp;
    if (typeof rr === 'string') {
      try { rr = JSON.parse(rr); } catch { /* ignore */ }
    }
    const match = (label: any) => normText(label) === normText(targetLabel) ||
      normText(label).includes(normText(targetLabel));
    // Array-of-sections
    if (Array.isArray(rr)) {
      for (const sec of rr) {
        const arr = sec?.responses;
        if (Array.isArray(arr)) {
          for (const qr of arr) {
            if (match(qr?.label)) return qr?.response;
          }
        }
      }
    }
    // Object-with-sections
    if (rr && Array.isArray(rr.sections)) {
      for (const sec of rr.sections) {
        const arr = sec?.responses;
        if (Array.isArray(arr)) {
          for (const qr of arr) {
            if (match(qr?.label)) return qr?.response;
          }
        }
      }
    }
    return null;
  };
  const firstCheckedOption = (val: any): string | null => {
    if (!Array.isArray(val)) return null;
    for (const item of val) {
      if (item && typeof item === 'object' && item.checked && item.option) {
        return String(item.option);
      }
    }
    return null;
  };

  // Index latest response per form and applicantProcessId
  function buildLatestIndex(formId: string): Map<string, ProcessedResponse> {
    const map = new Map<string, ProcessedResponse>();
    for (const r of filteredResponses) {
      if (String(r.formId) !== String(formId)) continue;
      const key = String(r.applicantProcessId || r.id);
      const existing = map.get(key);
      if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
        map.set(key, r);
      } else if (!existing) {
        map.set(key, r);
      }
    }
    return map;
  }

  const rowIdx = buildLatestIndex(row.formId);
  const colIdx = buildLatestIndex(column.formId);
  const valIdx = buildLatestIndex(value.formId);
  console.log('processCrossTabWidget: Indexes built - rowIdx:', rowIdx.size, 'colIdx:', colIdx.size, 'valIdx:', valIdx.size);

  // Collect cells using value responses as driver
  const rowsSet = new Set<string>();
  const colsSet = new Set<string>();
  const cellAgg = new Map<string, Map<string, number[]>>();

  const norm = (s: any): string => (s === null || s === undefined ? '' : String(s).trim());
  const addAgg = (rk: string, ck: string, v: number) => {
    if (!Number.isFinite(v)) return;
    let m = cellAgg.get(rk);
    if (!m) {
      m = new Map();
      cellAgg.set(rk, m);
    }
    const existing = m.get(ck);
    if (existing) {
      existing.push(v);
    } else {
      m.set(ck, [v]);
    }
  };

  let processedCount = 0;
  for (const [apId, vResp] of valIdx.entries()) {
    console.log('processCrossTabWidget: Processing value response for apId:', apId, 'formId:', vResp.formId);
    // Resolve row value (same form or via index)
    let rVal: any = null;
    if (String(row.formId) === String(value.formId)) {
      rVal = service.getFieldValue(vResp, row.fieldId, row.systemField, valFD);
      console.log('processCrossTabWidget: Row value from same form:', rVal);
    } else {
      const rr = rowIdx.get(apId);
      if (rr) {
        rVal = service.getFieldValue(rr, row.fieldId, row.systemField, rowFD);
        console.log('processCrossTabWidget: Row value from index:', rVal);
      } else {
        console.log('processCrossTabWidget: No row response found for apId:', apId);
      }
    }
    if (rVal === null || rVal === undefined) {
      // Try fallback via axis title label
      const fbRow = extractByLabel(vResp, cx?.rowAxisTitle);
      let chosenRow: any = fbRow;
      if (Array.isArray(fbRow)) {
        const fc = firstCheckedOption(fbRow);
        if (fc !== null) chosenRow = fc;
      }
      if (chosenRow !== null && chosenRow !== undefined) {
        console.log('processCrossTabWidget: Row fallback via label matched axis title =>', cx?.rowAxisTitle, 'value=', chosenRow);
        rVal = chosenRow;
      }
    }
    if ((rVal === null || rVal === undefined) && !row.includeMissing) {
      const avail = extractQuestionIdsFromResponse(vResp);
      console.log(
        'processCrossTabWidget: Skipping due to missing row value and includeMissing=false. Expected fieldId=',
        row.fieldId,
        'systemField=',
        row.systemField,
        'Available questionIds(sample)=',
        avail,
        'rowAxisTitle=',
        cx?.rowAxisTitle
      );
      continue;
    }
    const rKey = norm(rVal ?? MISSING);

    // Resolve column value
    let cVal: any = null;
    if (String(column.formId) === String(value.formId)) {
      cVal = service.getFieldValue(vResp, column.fieldId, column.systemField, valFD);
      console.log('processCrossTabWidget: Column value from same form:', cVal);
    } else {
      const cr = colIdx.get(apId);
      if (cr) {
        cVal = service.getFieldValue(cr, column.fieldId, column.systemField, colFD);
        console.log('processCrossTabWidget: Column value from index:', cVal);
      } else {
        console.log('processCrossTabWidget: No column response found for apId:', apId);
      }
    }
    if (cVal === null || cVal === undefined) {
      // Try fallback via axis title label
      const fbCol = extractByLabel(vResp, cx?.colAxisTitle || cx?.columnAxisTitle);
      let chosenCol: any = fbCol;
      if (Array.isArray(fbCol)) {
        const fc = firstCheckedOption(fbCol);
        if (fc !== null) chosenCol = fc;
      }
      if (chosenCol !== null && chosenCol !== undefined) {
        console.log('processCrossTabWidget: Column fallback via label matched axis title =>', (cx?.colAxisTitle || cx?.columnAxisTitle), 'value=', chosenCol);
        cVal = chosenCol;
      }
    }
    if ((cVal === null || cVal === undefined) && !column.includeMissing) {
      const avail = extractQuestionIdsFromResponse(vResp);
      console.log(
        'processCrossTabWidget: Skipping due to missing column value and includeMissing=false. Expected fieldId=',
        column.fieldId,
        'systemField=',
        column.systemField,
        'Available questionIds(sample)=',
        avail,
        'colAxisTitle=',
        (cx?.colAxisTitle || cx?.columnAxisTitle)
      );
      continue;
    }
    const cKey = norm(cVal ?? MISSING);
    console.log('processCrossTabWidget: Resolved keys => row:', rKey, 'col:', cKey);

    // Compute numeric contribution
    let contrib = 0;
    if (value.aggregation === 'count') {
      contrib = 1;
      console.log('processCrossTabWidget: Count aggregation, contrib=1');
    } else {
      const raw = service.getFieldValue(vResp, value.fieldId, value.systemField, valFD);
      const num = toNumber(raw);
      console.log('processCrossTabWidget: Value field raw:', raw, 'num:', num);
      if (num === null) {
        console.log('processCrossTabWidget: Skipping due to null numeric value');
        continue;
      }
      contrib = num;
    }

    rowsSet.add(rKey);
    colsSet.add(cKey);
    addAgg(rKey, cKey, contrib);
    processedCount++;
    console.log('processCrossTabWidget: Added to cell', rKey, cKey, 'contrib:', contrib);
  }
  console.log('processCrossTabWidget: Processed', processedCount, 'responses');

  // If nothing matched, return empty
  console.log('processCrossTabWidget: Final sets - rows:', rowsSet.size, 'cols:', colsSet.size, 'cellAgg:', cellAgg.size);
  if (rowsSet.size === 0 || colsSet.size === 0 || cellAgg.size === 0) {
    console.log('processCrossTabWidget: Returning empty due to no data');
    return createEmptyPayload(widget) as any;
  }

  // Sort categories for stable output
  const rows = Array.from(rowsSet).sort();
  const columns = Array.from(colsSet).sort();
  console.log('processCrossTabWidget: Rows sample:', rows.slice(0, 10), 'Columns sample:', columns.slice(0, 10));

  // Build matrix with aggregation
  const values: number[][] = Array.from({ length: rows.length }, () =>
    Array.from({ length: columns.length }, () => 0),
  );

  for (let i = 0; i < rows.length; i++) {
    const rk = rows[i];
    const rowMap = cellAgg.get(rk);
    if (!rowMap) continue;
    for (let j = 0; j < columns.length; j++) {
      const ck = columns[j];
      const arr = rowMap.get(ck) || [];
      if (arr.length === 0) {
        values[i][j] = 0;
      } else {
        if (value.aggregation === 'count') {
          values[i][j] = arr.length;
        } else if (value.aggregation === 'sum') {
          values[i][j] = arr.reduce((a, b) => a + b, 0);
        } else if (value.aggregation === 'mean') {
          values[i][j] = arr.reduce((a, b) => a + b, 0) / arr.length;
        } else if (value.aggregation === 'median') {
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          values[i][j] = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        } else if (value.aggregation === 'mode') {
          const freq: Record<number, number> = {};
          arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
          const maxFreq = Math.max(...Object.values(freq));
          const modes = Object.keys(freq).filter(k => freq[Number(k)] === maxFreq).map(Number);
          values[i][j] = modes.length === 1 ? modes[0] : modes[0]; // Take first mode if multiple
        } else if (value.aggregation === 'min') {
          values[i][j] = Math.min(...arr);
        } else if (value.aggregation === 'max') {
          values[i][j] = Math.max(...arr);
        } else if (value.aggregation === 'std') {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
          values[i][j] = Math.sqrt(variance);
        } else if (value.aggregation === 'variance') {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          values[i][j] = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        } else if (value.aggregation === 'p10') {
          const sorted = [...arr].sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.1);
          values[i][j] = sorted[Math.max(0, idx)];
        } else if (value.aggregation === 'p25') {
          const sorted = [...arr].sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.25);
          values[i][j] = sorted[Math.max(0, idx)];
        } else if (value.aggregation === 'p50') {
          const sorted = [...arr].sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.5);
          values[i][j] = sorted[Math.max(0, idx)];
        } else if (value.aggregation === 'p75') {
          const sorted = [...arr].sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.75);
          values[i][j] = sorted[Math.max(0, idx)];
        } else if (value.aggregation === 'p90') {
          const sorted = [...arr].sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.9);
          values[i][j] = sorted[Math.max(0, idx)];
        } else {
          // Default to sum for unknown aggregations
          values[i][j] = arr.reduce((a, b) => a + b, 0);
        }
      }
    }
  }

  // Totals
  let rowTotals: number[] | undefined;
  let colTotals: number[] | undefined;
  let grandTotal: number | undefined;
  const appearance = config.appearance || {};

  if (appearance.showRowTotals) {
    rowTotals = values.map((rowArr) => rowArr.reduce((a, b) => a + (Number(b) || 0), 0));
  }
  if (appearance.showColumnTotals) {
    colTotals = columns.map((_, j) => values.reduce((sum, r) => sum + (Number(r[j]) || 0), 0));
  }
  if (appearance.showGrandTotal) {
    if (rowTotals) {
      grandTotal = rowTotals.reduce((a, b) => a + (Number(b) || 0), 0);
    } else {
      grandTotal = values.flat().reduce((a, b) => a + (Number(b) || 0), 0);
    }
  }

  console.log('processCrossTabWidget: Returning data - rows:', rows.length, 'columns:', columns.length, 'values shape:', values.length, 'x', values[0]?.length);
  return {
    type: 'crosstab',
    title: widget.title,
    rows,
    columns,
    values,
    rowTotals,
    colTotals,
    grandTotal,
    meta: widget.config || {},
    empty: rows.length === 0 || columns.length === 0,
  };
}
