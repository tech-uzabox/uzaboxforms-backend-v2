export function transformWidgetPayload(payload: any) {
  // Validate required fields
  // console.dir(payload, { depth: null })
  // console.log(!payload.dashboardId || !payload.title || !payload.visualizationType || !payload.dateRange)
  // console.log(payload.dashboardId, payload.title, payload.visualizationType, payload.dateRange)
  if (!payload.dashboardId || !payload.title || !payload.visualizationType || !payload.dateRange) {
    throw new Error("Required fields: dashboardId, title, visualizationType, dateRange");
  }

  // Validate multi-metric widgets have at least one metric
  if (["bar", "line"].includes(payload.visualizationType) &&
      (!payload.metrics || payload.metrics.length === 0)) {
    throw new Error("Multi-metric widgets require at least one metric");
  }

  // Validate crosstab widgets have required configuration
  if (payload.visualizationType === "crosstab") {
    if (!payload.options?.crosstab) {
      throw new Error("Crosstab widgets require crosstab configuration in options");
    }
    const crosstab = payload.options.crosstab;
    if (!crosstab.row?.formId || (!crosstab.row?.fieldId && !crosstab.row?.systemField)) {
      throw new Error("Crosstab row category must be configured");
    }
    if (!crosstab.column?.formId || (!crosstab.column?.fieldId && !crosstab.column?.systemField)) {
      throw new Error("Crosstab column category must be configured");
    }
    if (!crosstab.value?.formId || (!crosstab.value?.fieldId && !crosstab.value?.systemField)) {
      throw new Error("Crosstab value metric must be configured");
    }
    if (!crosstab.value?.aggregation) {
      throw new Error("Crosstab value aggregation must be specified");
    }
  }

  // Validate CCT widgets have required configuration
  if (payload.visualizationType === "cct") {
    if (!payload.options?.cct) {
      throw new Error("CCT widgets require CCT configuration in options");
    }
    const cct = payload.options.cct;
    if (!cct.formId) {
      throw new Error("CCT widgets require a form ID");
    }
    if (!cct.factors || !Array.isArray(cct.factors) || cct.factors.length === 0) {
      throw new Error("CCT widgets require at least one factor");
    }
    if (!cct.measures || !Array.isArray(cct.measures) || cct.measures.length === 0) {
      throw new Error("CCT widgets require at least one measure");
    }
    // Validate each factor has fieldId
    for (const factor of cct.factors) {
      if (!factor.fieldId) {
        throw new Error("CCT factors must have fieldId specified");
      }
    }
    // Validate each measure has fieldId and aggregation
    for (const measure of cct.measures) {
      if (!measure.fieldId) {
        throw new Error("CCT measures must have fieldId specified");
      }
      if (!measure.aggregation) {
        throw new Error("CCT measures must have aggregation specified");
      }
    }
  }

  // Transform groupBy
  const transformedGroupBy = payload.groupBy
    ? {
        kind: payload.groupBy.kind || (payload.groupBy.field && payload.groupBy.field.startsWith("$") ? "categorical" : "categorical"),
        ...(payload.groupBy.systemField
          ? { systemField: payload.groupBy.systemField }
          : payload.groupBy.fieldId
          ? { fieldId: payload.groupBy.fieldId }
          : payload.groupBy.field && payload.groupBy.field.startsWith("$")
          ? { systemField: payload.groupBy.field }
          : payload.groupBy.field
          ? { fieldId: payload.groupBy.field }
          : {}),
        ...(payload.groupBy.timeBucket && { timeBucket: payload.groupBy.timeBucket }),
        ...(payload.groupBy.dateGranularity && { dateGranularity: payload.groupBy.dateGranularity }),
        includeMissing: payload.groupBy.includeMissing || false,
      }
    : undefined;

  // Transform dateRange
  const transformedDateRange = {
    preset: payload.dateRange.preset || "all",
    ...(payload.dateRange.from && { from: new Date(payload.dateRange.from) }),
    ...(payload.dateRange.to && { to: new Date(payload.dateRange.to) }),
    ...(payload.dateRange.startDate && { startDate: new Date(payload.dateRange.startDate) }),
    ...(payload.dateRange.endDate && { endDate: new Date(payload.dateRange.endDate) }),
  };

  // Transform filters
  const transformedFilters = (payload.filters || payload.configuration?.filters || []).map((filter: any) => ({
    id: filter.id || `filter_${Date.now()}_${Math.random()}`,
    formId: filter.formId || (payload.metrics && payload.metrics.length > 0 ? payload.metrics[0].formId : payload.formId),
    ...(filter.systemField
      ? { systemField: filter.systemField }
      : filter.fieldId
      ? { fieldId: filter.fieldId }
      : filter.field && filter.field.startsWith("$")
      ? { systemField: filter.field }
      : filter.field
      ? { fieldId: filter.field }
      : {}),
    operator: filter.operator,
    value: filter.value,
  }));

  // Transform sources (legacy support)
  const transformedSources = payload.sources ||
    (payload.formId ? [{
      formId: payload.formId,
      ...(payload.configuration?.xField && payload.configuration.xField.startsWith("$")
        ? { systemField: payload.configuration.xField }
        : { fieldId: payload.configuration.xField }),
    }] : []);

  // Transform metrics
  const transformedMetrics = payload.metrics
    ? payload.metrics.map((metric: any) => ({
        id: metric.id,
        label: metric.label,
        formId: metric.formId,
        ...(metric.systemField
          ? { systemField: metric.systemField }
          : metric.fieldId
          ? { fieldId: metric.fieldId }
          : {}),
        ...(payload.metricMode !== "value" && metric.aggregation && { aggregation: metric.aggregation }),
        ...(metric.appearance && { appearance: metric.appearance }),
      }))
    : payload.configuration
    ? [{
        id: "primary_metric",
        label: payload.configuration.yField || "Count",
        formId: payload.formId,
        ...(payload.configuration.yField && payload.configuration.yField !== "__count__"
          ? payload.configuration.yField.startsWith("$")
            ? { systemField: payload.configuration.yField }
            : { fieldId: payload.configuration.yField }
          : {}),
        ...(payload.metricMode !== "value" && { aggregation: payload.configuration.aggregationType || "count" }),
      }]
    : [];

  // Build the config object
  // Normalize options to ensure crosstab and cct are correctly nested under options
  const normalizedOptions: any = { ...(payload.options || {}) };
  if (payload.visualizationType === "crosstab") {
    const crosstab = (payload.options?.crosstab) || payload.crosstab;
    if (crosstab) {
      normalizedOptions.crosstab = {
        row: { includeMissing: false, ...(crosstab.row || {}) },
        column: { includeMissing: false, ...(crosstab.column || {}) },
        value: { ...(crosstab.value || {}) },
        ...(crosstab.rowAxisTitle !== undefined ? { rowAxisTitle: String(crosstab.rowAxisTitle) } : {}),
        ...(crosstab.colAxisTitle !== undefined ? { colAxisTitle: String(crosstab.colAxisTitle) } : {}),
      };
    }
  }
  if (payload.visualizationType === "cct") {
    const cct = (payload.options?.cct) || payload.cct;
    if (cct) {
      normalizedOptions.cct = {
        formId: cct.formId,
        factors: cct.factors || [],
        measures: cct.measures || [],
      };
    }
  }
  if (payload.visualizationType === "bubble-map") {
    const bubbleMap = (payload.options?.bubbleMap) || payload.bubbleMap;
    if (bubbleMap) {
      normalizedOptions.bubbleMap = {
        metric: bubbleMap.metric || {
          formId: "",
          countryFieldId: "",
          cityFieldId: "",
          valueFieldId: "",
        },
        filters: bubbleMap.filters || [],
        appearance: bubbleMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          fillColor: "#3b82f6",
          borderColor: "#ffffff",
          showCityName: true,
          cityNameColor: "#ffffff",
          showValueTooltip: true,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      };
    }
  }

  if (payload.visualizationType === "flow-map") {
    const flowMap = (payload.options?.flowMap) || payload.flowMap;
    if (flowMap) {
      normalizedOptions.flowMap = {
        metric: flowMap.metric || {
          formId: "",
          region: "africa",
          city1FieldId: "",
          city2FieldId: "",
          valueFieldId: "",
          primaryCityIndicator: { fieldId: "", value: "" },
        },
        filters: flowMap.filters || [],
        appearance: flowMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          primaryCityColor: "#ef4444",
          secondaryCityColor: "#06b6d4",
          lineColor: "#3b82f6",
          showCityName: true,
          primaryCityNameColor: "#ffffff",
          secondaryCityNameColor: "#ffffff",
          showValueTooltip: true,
          showArrowHead: false,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      };
    }
  }

  const config: any = {
    ...(transformedGroupBy && { groupBy: transformedGroupBy }),
    dateRange: transformedDateRange,
    filters: transformedFilters,
    ...(payload.topN && { topN: payload.topN }),
    ...(payload.sort && { sort: payload.sort }),
    ...(payload.combinationMode && { combinationMode: payload.combinationMode }),
    ...(payload.appearance && { appearance: payload.appearance }),
    ...(Object.keys(normalizedOptions).length > 0 && { options: normalizedOptions }),
    ...(payload.realTime && { realTime: payload.realTime }),
    ...(payload.valueModeFieldId && { valueModeFieldId: payload.valueModeFieldId }),
    ...(payload.metricMode && { metricMode: payload.metricMode }),
    ...(transformedMetrics.length > 0 && { metrics: transformedMetrics }),
    ...(transformedSources.length > 0 && { sources: transformedSources }),
    ...(payload.metricMode !== "value" && (payload.aggregation || payload.configuration?.aggregationType) && {
      aggregation: payload.aggregation || payload.configuration.aggregationType
    }),
    ...(payload.configuration && { configuration: payload.configuration }),
  };

  return {
    dashboardId: payload.dashboardId,
    title: payload.title.trim(),
    description: payload.description,
    visualizationType: payload.visualizationType,
    config,
    ...(payload.order !== undefined && { order: payload.order }),
  };
}
export function transformWidgetPayloadSpecial(payload: any) {
  // Validate required fields
  // console.dir(payload, { depth: null })
  // console.log(!payload.dashboardId || !payload.title || !payload.visualizationType || !payload.dateRange)
  // console.log(payload.dashboardId, payload.title, payload.visualizationType, payload.dateRange)
  if (!payload.dateRange) {
    throw new Error("Required fields: dashboardId, title, visualizationType, dateRange");
  }

  // Transform groupBy
  const transformedGroupBy = payload.groupBy
    ? {
        kind: payload.groupBy.kind || (payload.groupBy.field && payload.groupBy.field.startsWith("$") ? "categorical" : "categorical"),
        ...(payload.groupBy.systemField
          ? { systemField: payload.groupBy.systemField }
          : payload.groupBy.fieldId
          ? { fieldId: payload.groupBy.fieldId }
          : payload.groupBy.field && payload.groupBy.field.startsWith("$")
          ? { systemField: payload.groupBy.field }
          : payload.groupBy.field
          ? { fieldId: payload.groupBy.field }
          : {}),
        ...(payload.groupBy.timeBucket && { timeBucket: payload.groupBy.timeBucket }),
        ...(payload.groupBy.dateGranularity && { dateGranularity: payload.groupBy.dateGranularity }),
        includeMissing: payload.groupBy.includeMissing || false,
      }
    : undefined;

  // Transform dateRange
  const transformedDateRange = {
    preset: payload.dateRange.preset || "all",
    ...(payload.dateRange.from && { from: new Date(payload.dateRange.from) }),
    ...(payload.dateRange.to && { to: new Date(payload.dateRange.to) }),
    ...(payload.dateRange.startDate && { startDate: new Date(payload.dateRange.startDate) }),
    ...(payload.dateRange.endDate && { endDate: new Date(payload.dateRange.endDate) }),
  };

  // Transform filters
  const transformedFilters = (payload.filters || payload.configuration?.filters || []).map((filter: any) => ({
    id: filter.id || `filter_${Date.now()}_${Math.random()}`,
    formId: filter.formId || (payload.metrics && payload.metrics.length > 0 ? payload.metrics[0].formId : payload.formId),
    ...(filter.systemField
      ? { systemField: filter.systemField }
      : filter.fieldId
      ? { fieldId: filter.fieldId }
      : filter.field && filter.field.startsWith("$")
      ? { systemField: filter.field }
      : filter.field
      ? { fieldId: filter.field }
      : {}),
    operator: filter.operator,
    value: filter.value,
  }));

  // Transform sources (legacy support)
  const transformedSources = payload.sources ||
    (payload.formId ? [{
      formId: payload.formId,
      ...(payload.configuration?.xField && payload.configuration.xField.startsWith("$")
        ? { systemField: payload.configuration.xField }
        : { fieldId: payload.configuration.xField }),
    }] : []);

  // Transform metrics
  const transformedMetrics = payload.metrics
    ? payload.metrics.map((metric: any) => ({
        id: metric.id,
        label: metric.label,
        formId: metric.formId,
        ...(metric.systemField
          ? { systemField: metric.systemField }
          : metric.fieldId
          ? { fieldId: metric.fieldId }
          : {}),
        ...(payload.metricMode !== "value" && metric.aggregation && { aggregation: metric.aggregation }),
        ...(metric.appearance && { appearance: metric.appearance }),
      }))
    : payload.configuration
    ? [{
        id: "primary_metric",
        label: payload.configuration.yField || "Count",
        formId: payload.formId,
        ...(payload.configuration.yField && payload.configuration.yField !== "__count__"
          ? payload.configuration.yField.startsWith("$")
            ? { systemField: payload.configuration.yField }
            : { fieldId: payload.configuration.yField }
          : {}),
        ...(payload.metricMode !== "value" && { aggregation: payload.configuration.aggregationType || "count" }),
      }]
    : [];

  // Build the config object
  // Normalize options to ensure crosstab and cct are correctly nested under options
  const normalizedOptionsSpecial: any = { ...(payload.options || {}) };
  if (payload.visualizationType === "crosstab") {
    const crosstab = (payload.options?.crosstab) || payload.crosstab;
    if (crosstab) {
      normalizedOptionsSpecial.crosstab = {
        row: { includeMissing: false, ...(crosstab.row || {}) },
        column: { includeMissing: false, ...(crosstab.column || {}) },
        value: { ...(crosstab.value || {}) },
        ...(crosstab.rowAxisTitle !== undefined ? { rowAxisTitle: String(crosstab.rowAxisTitle) } : {}),
        ...(crosstab.colAxisTitle !== undefined ? { colAxisTitle: String(crosstab.colAxisTitle) } : {}),
      };
    }
  }
  if (payload.visualizationType === "cct") {
    const cct = (payload.options?.cct) || payload.cct;
    if (cct) {
      normalizedOptionsSpecial.cct = {
        formId: cct.formId,
        factors: cct.factors || [],
        measures: cct.measures || [],
      };
    }
  }
  if (payload.visualizationType === "bubble-map") {
    const bubbleMap = (payload.options?.bubbleMap) || payload.bubbleMap;
    if (bubbleMap) {
      normalizedOptionsSpecial.bubbleMap = {
        metric: bubbleMap.metric || {
          formId: "",
          countryFieldId: "",
          cityFieldId: "",
          valueFieldId: "",
        },
        filters: bubbleMap.filters || [],
        appearance: bubbleMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          fillColor: "#3b82f6",
          borderColor: "#ffffff",
          showCityName: true,
          cityNameColor: "#ffffff",
          showValueTooltip: true,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      };
    }
  }
  if (payload.visualizationType === "flow-map") {
    const flowMap = (payload.options?.flowMap) || payload.flowMap;
    if (flowMap) {
      normalizedOptionsSpecial.flowMap = {
        metric: flowMap.metric || {
          formId: "",
          region: "africa",
          city1FieldId: "",
          city2FieldId: "",
          valueFieldId: "",
          primaryCityIndicator: { fieldId: "", value: "" },
        },
        filters: flowMap.filters || [],
        appearance: flowMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          primaryCityColor: "#ef4444",
          secondaryCityColor: "#06b6d4",
          lineColor: "#3b82f6",
          showCityName: true,
          primaryCityNameColor: "#ffffff",
          secondaryCityNameColor: "#ffffff",
          showValueTooltip: true,
          showArrowHead: false,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      };
    }
  }

  const config: any = {
    ...(transformedGroupBy && { groupBy: transformedGroupBy }),
    dateRange: transformedDateRange,
    filters: transformedFilters,
    ...(payload.topN && { topN: payload.topN }),
    ...(payload.sort && { sort: payload.sort }),
    ...(payload.combinationMode && { combinationMode: payload.combinationMode }),
    ...(payload.appearance && { appearance: payload.appearance }),
    ...(Object.keys(normalizedOptionsSpecial).length > 0 && { options: normalizedOptionsSpecial }),
    ...(payload.realTime && { realTime: payload.realTime }),
    ...(payload.valueModeFieldId && { valueModeFieldId: payload.valueModeFieldId }),
    ...(payload.metricMode && { metricMode: payload.metricMode }),
    ...(transformedMetrics.length > 0 && { metrics: transformedMetrics }),
    ...(transformedSources.length > 0 && { sources: transformedSources }),
    ...(payload.metricMode !== "value" && (payload.aggregation || payload.configuration?.aggregationType) && {
      aggregation: payload.aggregation || payload.configuration.aggregationType
    }),
    ...(payload.configuration && { configuration: payload.configuration }),
  };

  return {
    config,
    ...(payload.order !== undefined && { order: payload.order }),
  };
}

export function transformWidgetUpdatePayload(payload: any) {
  const updateData: any = {};

  // Handle basic fields
  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.visualizationType !== undefined) updateData.visualizationType = payload.visualizationType;
  if (payload.order !== undefined) updateData.order = payload.order;

  // If config is provided directly, use it
  if (payload.config !== undefined) {
    updateData.config = payload.config;
    return updateData;
  }

  // Otherwise, transform the individual fields into config
  const configUpdates: any = {};

  // Handle metric mode changes
  if (payload.metricMode !== undefined) {
    configUpdates.metricMode = payload.metricMode;
    // Clear aggregation if switching to 'value' mode
    if (payload.metricMode === "value") {
      configUpdates.aggregation = undefined;
      // Remove aggregation from metrics
      if (payload.metrics) {
        configUpdates.metrics = payload.metrics.map((metric: any) => {
          const { aggregation, ...metricWithoutAggregation } = metric;
          return metricWithoutAggregation;
        });
      }
    } else {
      // Keep aggregation for aggregation mode
      if (payload.aggregation !== undefined) {
        configUpdates.aggregation = payload.aggregation;
      }
      if (payload.metrics !== undefined) {
        configUpdates.metrics = payload.metrics;
      }
    }
  } else {
    // No metric mode change, handle other fields
    if (payload.metrics !== undefined) {
      configUpdates.metrics = payload.metrics;
    }
    if (payload.aggregation !== undefined && payload.metricMode !== "value") {
      configUpdates.aggregation = payload.aggregation;
    }
  }

  // Handle other fields
  if (payload.sources !== undefined) configUpdates.sources = payload.sources;
  if (payload.groupBy !== undefined) configUpdates.groupBy = payload.groupBy;
  if (payload.dateRange !== undefined) configUpdates.dateRange = payload.dateRange;
  if (payload.filters !== undefined) configUpdates.filters = payload.filters;
  if (payload.topN !== undefined) configUpdates.topN = payload.topN;
  if (payload.sort !== undefined) configUpdates.sort = payload.sort;
  if (payload.combinationMode !== undefined) configUpdates.combinationMode = payload.combinationMode;
  if (payload.appearance !== undefined) configUpdates.appearance = payload.appearance;
  if (payload.options !== undefined) configUpdates.options = payload.options;
  // Allow direct crosstab updates without requiring full options object
  if (payload.crosstab !== undefined) {
    configUpdates.options = {
      ...(configUpdates.options || {}),
      crosstab: {
        row: { includeMissing: false, ...(payload.crosstab.row || {}) },
        column: { includeMissing: false, ...(payload.crosstab.column || {}) },
        value: { ...(payload.crosstab.value || {}) },
        ...(payload.crosstab.rowAxisTitle !== undefined ? { rowAxisTitle: String(payload.crosstab.rowAxisTitle) } : {}),
        ...(payload.crosstab.colAxisTitle !== undefined ? { colAxisTitle: String(payload.crosstab.colAxisTitle) } : {}),
      },
    };
  }
  // Allow direct CCT updates without requiring full options object
  if (payload.cct !== undefined) {
    configUpdates.options = {
      ...(configUpdates.options || {}),
      cct: {
        formId: payload.cct.formId,
        factors: payload.cct.factors || [],
        measures: payload.cct.measures || [],
      },
    };
  }
  // Allow direct bubbleMap updates without requiring full options object
  if (payload.bubbleMap !== undefined) {
    configUpdates.options = {
      ...(configUpdates.options || {}),
      bubbleMap: {
        metric: payload.bubbleMap.metric || {
          formId: "",
          countryFieldId: "",
          cityFieldId: "",
          valueFieldId: "",
        },
        filters: payload.bubbleMap.filters || [],
        appearance: payload.bubbleMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          fillColor: "#3b82f6",
          borderColor: "#ffffff",
          showCityName: true,
          cityNameColor: "#ffffff",
          showValueTooltip: true,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      },
    };
  }

  // Allow direct flowMap updates without requiring full options object
  if (payload.flowMap !== undefined) {
    configUpdates.options = {
      ...(configUpdates.options || {}),
      flowMap: {
        metric: payload.flowMap.metric || {
          formId: "",
          region: "africa",
          city1FieldId: "",
          city2FieldId: "",
          valueFieldId: "",
          primaryCityIndicator: { fieldId: "", value: "" },
        },
        filters: payload.flowMap.filters || [],
        appearance: payload.flowMap.appearance || {
          showLegend: false,
          legendLabel: "Value",
          legendLocation: "bottom-center",
          primaryCityColor: "#ef4444",
          secondaryCityColor: "#06b6d4",
          lineColor: "#3b82f6",
          showCityName: true,
          primaryCityNameColor: "#ffffff",
          secondaryCityNameColor: "#ffffff",
          showValueTooltip: true,
          showArrowHead: false,
          countryFillColor: "#e5e7eb",
          countryHoverColor: "#d1d5db",
        },
      },
    };
  }
  if (payload.realTime !== undefined) configUpdates.realTime = payload.realTime;
  if (payload.valueModeFieldId !== undefined) configUpdates.valueModeFieldId = payload.valueModeFieldId;
  if (payload.configuration !== undefined) configUpdates.configuration = payload.configuration;

  // Only update config if there are changes
  if (Object.keys(configUpdates).length > 0) {
    updateData.config = configUpdates;
  }

  return updateData;
}
