import { tool } from 'ai';
import z from 'zod';
import { PrismaService } from '../../db/prisma.service';

export const createDashboardTool = (prisma: PrismaService, currentUserId: string) => {
  return tool({
    description: 'Create a new dashboard with the provided name',
    parameters: z.object({
      name: z.string().min(1, 'Dashboard name is required').describe('The name of the dashboard to create'),
    }),
    execute: async ({ name }: { name: string }) => {
      try {
        const dashboard = await prisma.dashboard.create({
          data: {
            name,
            ownerId: currentUserId,
            layout: { order: [], layouts: {} },
          },
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        // Log audit (simplified, assuming audit service is available or skip for now)
        // await auditLogService.log(...)

        return {
          success: true,
          dashboard: {
            id: dashboard.id,
            name: dashboard.name,
            ownerId: dashboard.ownerId,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  } as any);
};
