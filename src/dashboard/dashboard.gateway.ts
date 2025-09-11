import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../db/prisma.service';
import { WidgetDataService } from '../widget/widget-data.service';

// Note: This is a simplified WebSocket service implementation
// In a real application, you would use @nestjs/websockets with Socket.IO
// For now, this provides the core logic for real-time dashboard updates

@Injectable()
export class DashboardGateway {
  private readonly logger = new Logger(DashboardGateway.name);
  private widgetSubscriptions: Map<string, Set<string>> = new Map(); // formId -> Set of userIds
  private userWidgets: Map<string, Set<string>> = new Map(); // userId -> Set of widgetIds
  private widgetUpdateTimes: Map<string, number> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private widgetDataService: WidgetDataService,
  ) {}

  // Method to register a user's interest in real-time updates for a widget
  async registerWidgetInterest(userId: string, widgetId: string) {
    try {
      // Get widget and associated forms
      const widget = await this.prisma.widget.findUnique({
        where: { id: widgetId },
      });
      if (!widget) return;

      // Track user widget subscriptions
      if (!this.userWidgets.has(userId)) {
        this.userWidgets.set(userId, new Set());
      }
      this.userWidgets.get(userId)!.add(widgetId);

      // Get all form IDs associated with this widget
      const formIds = this.getWidgetFormIds(widget);

      // Subscribe user to all forms used by this widget
      for (const formId of formIds) {
        if (!this.widgetSubscriptions.has(formId)) {
          this.widgetSubscriptions.set(formId, new Set());
        }
        this.widgetSubscriptions.get(formId)!.add(userId);
      }

      this.logger.log(`User ${userId} registered interest in widget ${widgetId}`);
    } catch (error) {
      this.logger.error('Error registering widget interest:', error);
    }
  }

  // Method to unregister a user's interest in real-time updates for a widget
  async unregisterWidgetInterest(userId: string, widgetId: string) {
    try {
      // Remove from user widget tracking
      if (this.userWidgets.has(userId)) {
        this.userWidgets.get(userId)!.delete(widgetId);
      }

      // Get widget and associated forms
      const widget = await this.prisma.widget.findUnique({
        where: { id: widgetId },
      });
      if (!widget) return;

      const formIds = this.getWidgetFormIds(widget);

      // Check if user has other widgets using the same forms
      const userWidgetIds = this.userWidgets.get(userId) || new Set();
      const userWidgets = await this.prisma.widget.findMany({
        where: { id: { in: Array.from(userWidgetIds) } },
      });

      const remainingFormIds = new Set<string>();
      userWidgets.forEach((w) => {
        this.getWidgetFormIds(w).forEach((fId) => remainingFormIds.add(fId));
      });

      // Unsubscribe from forms that are no longer needed
      for (const formId of formIds) {
        if (
          !remainingFormIds.has(formId) &&
          this.widgetSubscriptions.has(formId)
        ) {
          this.widgetSubscriptions.get(formId)!.delete(userId);

          // Clean up empty subscriptions
          if (this.widgetSubscriptions.get(formId)!.size === 0) {
            this.widgetSubscriptions.delete(formId);
          }
        }
      }

      this.logger.log(`User ${userId} unregistered interest in widget ${widgetId}`);
    } catch (error) {
      this.logger.error('Error unregistering widget interest:', error);
    }
  }

  private getWidgetFormIds(widget: any): string[] {
    const formIds = new Set<string>();

    // From config (stored as JSON)
    if (widget.config && typeof widget.config === 'object') {
      const config = widget.config as any;

      // From metrics (for bar/line charts)
      if (config.metrics && Array.isArray(config.metrics)) {
        config.metrics.forEach((metric: any) => {
          if (metric.formId) {
            formIds.add(metric.formId);
          }
        });
      }

      // From sources (for other visualizations)
      if (config.sources && Array.isArray(config.sources)) {
        config.sources.forEach((source: any) => {
          if (source.formId) {
            formIds.add(source.formId);
          }
        });
      }
    }

    return Array.from(formIds);
  }

  private cleanupUserSubscriptions(userId: string) {
    // Remove user from all form subscriptions
    for (const [formId, userSet] of this.widgetSubscriptions.entries()) {
      userSet.delete(userId);
      if (userSet.size === 0) {
        this.widgetSubscriptions.delete(formId);
      }
    }

    // Clear user widget tracking
    this.userWidgets.delete(userId);
  }

  // Public method to notify about form response updates
  async notifyFormResponseUpdate(formId: string) {
    try {
      this.logger.log(`New form response for form ${formId}`);

      // Get all users subscribed to this form
      const subscribedUsers = this.widgetSubscriptions.get(formId);
      if (!subscribedUsers || subscribedUsers.size === 0) {
        this.logger.log(`No users subscribed to form ${formId}`);
        return;
      }

      // Find all widgets that use this form and have real-time enabled
      const affectedWidgets = await this.prisma.widget.findMany({
        where: {
          config: {
            path: ['realTime', 'enabled'],
            equals: true,
          },
        },
      });

      const filteredWidgets = affectedWidgets.filter(widget => {
        const formIds = this.getWidgetFormIds(widget);
        return formIds.includes(formId);
      });

      if (filteredWidgets.length === 0) {
        this.logger.log(`No real-time widgets found for form ${formId}`);
        return;
      }

      this.logger.log(
        `Found ${filteredWidgets.length} real-time widgets affected by form ${formId}`
      );

      // For each affected widget, prepare updated data for subscribed users
      for (const widget of filteredWidgets) {
        const widgetId = widget.id;

        // Check if widget should update (throttling)
        const config = widget.config as any;
        const throttleSeconds = config?.realTime?.throttleSeconds || 3;
        const now = Date.now();
        const lastUpdate = this.getLastWidgetUpdate(widgetId);

        if (now - lastUpdate < throttleSeconds * 1000) {
          this.logger.log(`Skipping widget ${widgetId} due to throttling`);
          continue; // Skip if within throttle period
        }

        this.setLastWidgetUpdate(widgetId, now);

        // Get fresh widget data for each subscribed user
        for (const userId of subscribedUsers) {
          if (this.userWidgets.get(userId)?.has(widgetId)) {
            try {
              const widgetData = await this.widgetDataService.getWidgetData(widgetId, userId);

              // In a real implementation, this would emit to WebSocket clients
              // For now, we just log the update
              this.logger.log(`Widget ${widgetId} data updated for user ${userId}`, {
                widgetId,
                data: widgetData,
              });

              // TODO: Emit to actual WebSocket clients when Socket.IO is available
              // this.server.to(socketId).emit('widget-data-update', {
              //   widgetId,
              //   data: widgetData,
              // });

            } catch (error) {
              this.logger.error(
                `Error updating widget ${widgetId} for user ${userId}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in notifyFormResponseUpdate:', error);
    }
  }

  private getLastWidgetUpdate(widgetId: string): number {
    return this.widgetUpdateTimes.get(widgetId) || 0;
  }

  private setLastWidgetUpdate(widgetId: string, timestamp: number) {
    this.widgetUpdateTimes.set(widgetId, timestamp);
  }

  // Method to send custom events to specific users (mock implementation)
  sendToUser(userId: string, event: string, data: any) {
    this.logger.log(`Mock send to user ${userId}: ${event}`, data);
    // In a real implementation, this would emit to actual WebSocket clients
  }

  // Method to broadcast to all connected clients (mock implementation)
  broadcast(event: string, data: any) {
    this.logger.log(`Mock broadcast: ${event}`, data);
    // In a real implementation, this would broadcast to all WebSocket clients
  }
}
