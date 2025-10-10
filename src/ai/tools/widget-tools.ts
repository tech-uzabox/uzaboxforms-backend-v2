import { tool } from 'ai';
import { transformWidgetPayload, transformWidgetPayloadSpecial } from 'src/widget/utils/widget-transform.utils';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { WidgetSchema } from './widget.validator';

export const createWidgetTool = (prisma: PrismaService) => {
  return tool({
    description: 'create a new widget with the provided configuration',
    parameters: z.object({
      widget: WidgetSchema
    }),
    execute: async (widget: { widget: z.infer<typeof WidgetSchema> }) => {
      try {
        const data = transformWidgetPayloadSpecial(widget.widget.config);
        const count = await prisma.widget.count();
        const newWidget = await prisma.widget.create({
          data: {
            title: widget.widget.title,
            visualizationType: widget.widget.visualizationType,
            description: widget.widget.description,
            config: data.config,
            order: count + 1,
            dashboardId: widget.widget.dashboardId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log('Widget created:', newWidget);
        return newWidget;
      } catch (error) {
        console.error('Error creating widget:', error);
        return null;
      }
    },
  } as any);
};

export const previewWidgetTool = tool({
  description: 'preview the widgets in the ui for the user to view',
  parameters: z.object({
    widgetIds: z
      .array(z.string().uuid())
      .min(1, 'at least one widget id is required')
      .describe('array of widget ids to preview'),
  }),
  execute: async (data: { widgetIds: string[] }) => {
    return data.widgetIds;
  },
} as any);
