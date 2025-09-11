import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  ProcessedResponse,
  GroupedData,
  WidgetDataPayload,
  IWidgetFilter,
  IWidgetGroupBy,
  IWidgetMetric,
  SeriesData,
  Widget
} from './types/widget.types';
import { applyFilters, getFieldValue, getQuestion } from './utils/filter.utils';
import { resolveDateRange, normalizeResponses, getUniqueFormIds } from './utils/data.utils';
import { calculateAggregation } from './utils/aggregation.utils';
import { groupResponses, computeSortedGroupKeys } from './utils/grouping.utils';
import {
  processMultiMetricWidget,
  processCardWidget,
  processPieWidget,
  processHistogramWidget,
  processScatterWidget,
  processCalendarHeatmapWidget,
  processMapWidget
} from './processors/widget-processors';

@Injectable()
export class WidgetDataService {
  constructor(private prisma: PrismaService) {}

  /**
   * Core data aggregation function for widgets
   */
  async getWidgetData(widgetId: string, currentUserId?: string): Promise<WidgetDataPayload> {
    try {
      const widget = await this.prisma.widget.findUnique({
        where: { id: widgetId },
        include: { dashboard: true }
      });

      if (!widget) {
        throw new Error("Widget not found");
      }

      // Parse widget config from JSON
      const config = widget.config as any;
      if (!config) {
        return this.createEmptyPayload(widget);
      }

      const uniqueFormIds = getUniqueFormIds(config);
      const { startDate, endDate } = resolveDateRange(config.dateRange);

      // Get form designs for field processing
      const forms = await this.prisma.form.findMany({
        where: { id: { in: uniqueFormIds } }
      });
      const formDesignsMap = new Map(forms.map(f => [f.id, f.design as any]));

      // Get form responses
      const responses = await this.prisma.formResponse.findMany({
        where: {
          formId: { in: uniqueFormIds },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          applicantProcess: {
            include: {
              applicant: true,
              process: true
            }
          }
        }
      });

      if (!responses || responses.length === 0) {
        return this.createEmptyPayload(widget);
      }

      const allResponses = normalizeResponses(responses);
      const filteredResponses = await applyFilters(
        allResponses,
        config.filters || [],
        formDesignsMap
      );

      if (filteredResponses.length === 0) {
        return this.createEmptyPayload(widget);
      }

      switch (widget.visualizationType) {
        case "bar":
        case "line":
          return await processMultiMetricWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "card":
          return await processCardWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "pie":
          return await processPieWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "histogram":
          return await processHistogramWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "scatter":
          return await processScatterWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "calendar-heatmap":
          return await processCalendarHeatmapWidget(widget, filteredResponses, formDesignsMap, config, this);
        case "map":
          return await processMapWidget(widget, filteredResponses, formDesignsMap, config, this);
        default:
          throw new Error(`Unsupported visualization type: ${widget.visualizationType}`);
      }
    } catch (error) {
      console.error("Error in getWidgetData:", error);
      return {
        type: "card",
        title: "Error",
        value: undefined,
        statLabel: "Failed to load data",
        meta: {},
        errors: [error instanceof Error ? error.message : "Unknown error"],
        empty: true,
      };
    }
  }

  private createEmptyPayload(widget: Widget): WidgetDataPayload {
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

  // Expose utility methods for processors
  getFieldValue = getFieldValue;
  calculateAggregation = calculateAggregation;
  groupResponses = groupResponses;
  computeSortedGroupKeys = computeSortedGroupKeys;
}
