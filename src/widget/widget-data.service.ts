import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../db/prisma.service';
import {
  processCalendarHeatmapWidget,
  processCardWidget,
  processCrossTabWidget,
  processCCTWidget,
  processHistogramWidget,
  processMapWidget,
  processBubbleMapWidget,
  processFlowMapWidget,
  processMultiMetricWidget,
  processPieWidget,
  processScatterWidget,
} from './processors/widget-processors';
import { Widget, WidgetDataPayload } from './types/widget.types';
import { calculateAggregation } from './utils/aggregation.utils';
import {
  getUniqueFormIds,
  normalizeResponses,
  resolveDateRange,
} from './utils/data.utils';
import { applyFilters, getFieldValue } from './utils/filter.utils';
import { computeSortedGroupKeys, groupResponses } from './utils/grouping.utils';

@Injectable()
export class WidgetDataService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
    * Core data aggregation function for widgets
    */
  async getWidgetData(
    widgetId: string,
    currentUserId?: string,
  ): Promise<WidgetDataPayload> {

    const cacheKey = `widget-data:${widgetId}`;

    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<WidgetDataPayload>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const widget = await this.prisma.widget.findUnique({
        where: { id: widgetId },
        include: { dashboard: true },
      });

      if (!widget) {
        throw new Error('Widget not found');
      }

      const data = await this.processWidgetData(widget);

      // Cache the result for 1 hour (3600000 ms)
      if (!data?.empty) {
        await this.cacheManager.set(cacheKey, data, 3600000);
      }

      return data;
    } catch (error) {
      console.error('Error in getWidgetData:', error);
      return {
        type: 'card',
        title: 'Error',
        value: undefined,
        statLabel: 'Failed to load data',
        meta: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        empty: true,
      };
    }
  }

  /**
    * Core data aggregation function for sandbox widgets
    */
  async getWidgetSandboxData(
    widgetId: string,
    currentUserId?: string,
  ): Promise<WidgetDataPayload> {
    const cacheKey = `widget-sandbox-data:${widgetId}`;

    try {
      // Try to get from cache first
      const cachedData = await this.cacheManager.get<WidgetDataPayload>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const widget = await this.prisma.widgetSandbox.findFirst({
        where: { id: widgetId },
      });

      if (!widget) {
        throw new Error('Sandbox widget not found');
      }

      const data = await this.processWidgetData(widget);

      // Cache the result for 1 hour (3600000 ms)
      await this.cacheManager.set(cacheKey, data, 3600000);

      return data;
    } catch (error) {
      console.error('Error in getWidgetSandboxData:', error);
      return {
        type: 'card',
        title: 'Error',
        value: undefined,
        statLabel: 'Failed to load data',
        meta: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        empty: true,
      };
    }
  }

  private async processWidgetData(widget: any): Promise<WidgetDataPayload> {
    console.log('[WidgetDataService] processWidgetData called');
    console.log('[WidgetDataService] Widget ID:', widget.id);
    console.log('[WidgetDataService] Widget visualizationType:', widget.visualizationType);
    console.log('[WidgetDataService] Widget config:', JSON.stringify(widget.config, null, 2));

    try {
      // Parse widget config from JSON
      const config = widget.config as any;
      console.log('[WidgetDataService] Parsed config:', JSON.stringify(config, null, 2));

      if (!config) {
        console.log('[WidgetDataService] No config found - returning empty payload');
        return this.createEmptyPayload(widget);
      }

      const uniqueFormIds = getUniqueFormIds(config);
      console.log('[WidgetDataService] Unique form IDs:', uniqueFormIds);

      const { startDate, endDate } = resolveDateRange(config.dateRange);
      console.log('[WidgetDataService] Date range:', { startDate, endDate });

      // Get form designs for field processing
      const forms = await this.prisma.form.findMany({
        where: { id: { in: uniqueFormIds } },
      });
      console.log('[WidgetDataService] Found forms:', forms.length, forms.map(f => ({ id: f.id, name: f.name })));

      const formDesignsMap = new Map(forms.map((f) => [f.id, f.design as any]));
      console.log('[WidgetDataService] Form designs map size:', formDesignsMap.size);

      // Get form responses
      console.log('[WidgetDataService] Fetching form responses...');
      const responses = await this.prisma.formResponse.findMany({
        where: {
          formId: { in: uniqueFormIds },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          applicantProcess: {
            include: {
              applicant: true,
              process: true,
            },
          },
        },
      });

      console.log('[WidgetDataService] Raw responses count:', responses?.length || 0);

      if (!responses || responses.length === 0) {
        console.log('[WidgetDataService] No responses found - returning empty payload');
        return this.createEmptyPayload(widget);
      }

      const allResponses = normalizeResponses(responses);
      console.log('[WidgetDataService] Normalized responses count:', allResponses.length);

      const filteredResponses = await applyFilters(
        allResponses,
        config.filters || [],
        formDesignsMap,
      );
      console.log('[WidgetDataService] After filtering, responses count:', filteredResponses.length);
      if (widget.visualizationType === 'map') {
        console.log(widget.visualizationType, filteredResponses);
      }

      console.log('[WidgetDataService] Filtered responses count:', filteredResponses.length);

      if (filteredResponses.length === 0) {
        console.log('[WidgetDataService] No filtered responses - returning empty payload');
        return this.createEmptyPayload(widget);
      }

      console.log('[WidgetDataService] Entering switch statement for visualizationType:', widget.visualizationType);
      switch (widget.visualizationType) {
        case 'bar':
        case 'line':
          return await processMultiMetricWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'card':
          return await processCardWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'pie':
          return await processPieWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'histogram':
          return await processHistogramWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'scatter':
          return await processScatterWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'calendar-heatmap':
          return await processCalendarHeatmapWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'map':
          return await processMapWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'bubble-map':
          console.log('[WidgetDataService] Routing to processBubbleMapWidget');
          console.log('[WidgetDataService] Widget:', JSON.stringify(widget, null, 2));
          console.log('[WidgetDataService] Filtered responses:', filteredResponses.length);
          console.log('[WidgetDataService] Form designs map keys:', Array.from(formDesignsMap.keys()));
          return await processBubbleMapWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'flow-map':
          console.log('[WidgetDataService] Routing to processFlowMapWidget');
          return await processFlowMapWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'crosstab':
          return await processCrossTabWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        case 'cct':
          return await processCCTWidget(
            widget,
            filteredResponses,
            formDesignsMap,
            config,
            this,
          );
        default:
          console.log('[WidgetDataService] ERROR: Unsupported visualization type:', widget.visualizationType);
          throw new Error(
            `Unsupported visualization type: ${widget.visualizationType}`,
          );
      }
    } catch (error) {
      console.error('Error in getWidgetData:', error);
      return {
        type: 'card',
        title: 'Error',
        value: undefined,
        statLabel: 'Failed to load data',
        meta: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
      case 'map':
        return {
          ...base,
          type: 'map',
          countries: {},
        };
      case 'bubble-map':
        return {
          ...base,
          type: 'bubble-map',
          cities: [],
        };
      case 'flow-map':
        return {
          ...base,
          type: 'flow-map',
          connections: [],
          primaryCities: [],
        };
      case 'crosstab':
        return {
          ...base,
          type: 'crosstab',
          rows: [],
          columns: [],
          values: [],
        };
      case 'cct':
        return {
          ...base,
          type: 'cct',
          factors: [],
          measures: [],
          combinations: [],
          values: [],
        };
      default:
        return { ...base, type: 'card', value: 0, statLabel: 'No Data' };
    }
  }

  // Expose utility methods for processors
  getFieldValue = getFieldValue;
  calculateAggregation = calculateAggregation;
  groupResponses = groupResponses;
  computeSortedGroupKeys = computeSortedGroupKeys;

  /**
   * Invalidate widget cache for specific widget IDs
   */
  async invalidateWidgetCache(widgetIds: string[]): Promise<void> {
    const cacheKeys = widgetIds.flatMap(id => [
      `widget-data:${id}`,
      `widget-sandbox-data:${id}`
    ]);

    await Promise.all(
      cacheKeys.map(key => this.cacheManager.del(key))
    );
  }
}
