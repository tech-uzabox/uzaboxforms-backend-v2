import { tool } from 'ai';
import { transformWidgetPayloadSpecial } from 'src/widget/utils/widget-transform.utils';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { WidgetConfigSchema, WidgetSchema } from './widget.validator';

const WidgetSandboxSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  visualizationType: z.string(),
  config: WidgetConfigSchema,
});

export const createWidgetTool = (prisma: PrismaService) => {
  return tool({
    description: 'create a new widget with the provided configuration',
    parameters: z.object({
      widget: WidgetSchema,
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
  description: 'preview the widget in the ui for the user to view',
  parameters: z.object({
    widgetId: z.string().uuid().describe('widget id to be previewed'),
  }),
  execute: async (data: { widgetId: string[] }) => {
    return data.widgetId;
  },
} as any);

export const createWidgetSandboxTool = (
  prisma: PrismaService,
  chatId: string,
) => {
  return tool({
    description:
      'create a widget using the provided configuration for preview before committing to actual widget',
    parameters: z.object({
      widget: WidgetSandboxSchema,
    }),
    execute: async (data: { widget: z.infer<typeof WidgetSandboxSchema> }) => {
      try {
        const transformedData = transformWidgetPayloadSpecial(
          data.widget.config,
        );
        const count = await prisma.widgetSandbox.count({ where: { chatId } });
        const newWidget = await prisma.widgetSandbox.create({
          data: {
            title: data.widget.title,
            visualizationType: data.widget.visualizationType,
            description: data.widget.description,
            config: transformedData.config,
            order: count + 1,
            chatId: chatId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log('Widget sandbox created:', newWidget);
        return newWidget;
      } catch (error) {
        console.error('Error creating widget sandbox:', error);
        return null;
      }
    },
  } as any);
};

export const updateWidgetSandboxTool = (
  prisma: PrismaService,
  chatId: string,
) => {
  return tool({
    description: 'update an existing widget with new configuration',
    parameters: z.object({
      widgetId: z.string().uuid('Widget ID must be a valid UUID'),
      widget: WidgetSandboxSchema.partial(),
    }),
    execute: async (data: {
      widgetId: string;
      widget: Partial<z.infer<typeof WidgetSandboxSchema>>;
    }) => {
      try {
        const transformedData = data.widget.config
          ? transformWidgetPayloadSpecial(data.widget.config)
          : undefined;
        const updatedWidget = await prisma.widgetSandbox.update({
          where: { id: data.widgetId, chatId },
          data: {
            ...(data.widget.title && { title: data.widget.title }),
            ...(data.widget.visualizationType && {
              visualizationType: data.widget.visualizationType,
            }),
            ...(data.widget.description !== undefined && {
              description: data.widget.description,
            }),
            ...(transformedData && { config: transformedData.config }),
            updatedAt: new Date(),
          },
        });
        console.log('Widget sandbox updated:', updatedWidget);
        return updatedWidget;
      } catch (error) {
        console.error('Error updating widget sandbox:', error);
        return null;
      }
    },
  } as any);
};

export const deleteWidgetSandboxTool = (
  prisma: PrismaService,
  chatId: string,
) => {
  return tool({
    description: 'delete a widget',
    parameters: z.object({
      widgetId: z.string().uuid('Widget ID must be a valid UUID'),
    }),
    execute: async (data: { widgetId: string }) => {
      try {
        const deletedWidget = await prisma.widgetSandbox.delete({
          where: { id: data.widgetId, chatId },
        });
        console.log('Widget sandbox deleted:', deletedWidget);
        return { success: true, widgetId: data.widgetId };
      } catch (error) {
        console.error('Error deleting widget sandbox:', error);
        return { success: false, error: error.message };
      }
    },
  } as any);
};

export const commitWidgetSandboxTool = (
  prisma: PrismaService,
  chatId: string,
) => {
  return tool({
    description:
      'commit a widget to become a real widget on a dashboard',
    parameters: z.object({
      widgetId: z.string().uuid('Widget ID must be a valid UUID'),
      dashboardId: z.string().uuid('Dashboard ID must be a valid UUID'),
    }),
    execute: async (data: { widgetId: string; dashboardId: string }) => {
      try {
        // Get the sandbox widget
        const sandboxWidget = await prisma.widgetSandbox.findUnique({
          where: { id: data.widgetId, chatId },
        });

        if (!sandboxWidget) {
          return { success: false, error: 'Sandbox widget not found' };
        }

        if (sandboxWidget.isCommited) {
          return { success: false, error: 'Sandbox widget already commited' }
        }

        // Create the real widget
        const count = await prisma.widget.count({
          where: { dashboardId: data.dashboardId },
        });
        const newWidget = await prisma.widget.create({
          data: {
            title: sandboxWidget.title,
            visualizationType: sandboxWidget.visualizationType,
            description: sandboxWidget.description,
            config: sandboxWidget.config as any,
            order: count + 1,
            dashboardId: data.dashboardId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Delete the sandbox widget
        await prisma.widgetSandbox.update({
          where: { id: data.widgetId },
          data: {
            isCommited: true,
          }
        });

        console.log('Widget committed from sandbox:', newWidget);
        return { success: true, widget: newWidget };
      } catch (error) {
        console.error('Error committing widget sandbox:', error);
        return { success: false, error: error.message };
      }
    },
  } as any);
};
