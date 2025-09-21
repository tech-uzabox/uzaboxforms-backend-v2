import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { GetFormsFilter } from '../types/ai.types';

export const createGetFormsTool = (prisma: PrismaService) => {
  return tool({
    description: 'Get forms based on filter criteria',
    parameters: z.object({
      filter: z.object({
        startDate: z.string().optional().describe("the start date of the forms to get, used to get form after a specific date"),
        endDate: z.string().optional().describe("the end date of the forms to get, used to get form before a specific date"),
        status: z.enum(['ENABLED', 'DISABLED']).optional().describe("")
      }).optional().describe("This is the filter object used to customize data to be returned, there is optional startDate, endDate and status"),
    }),
    execute: async ({ filter }: { filter?: GetFormsFilter }) => {
      try {
        // Build where clause for efficient database filtering
        const where: {
          createdAt?: { gte?: Date; lte?: Date };
          status?: 'ENABLED' | 'DISABLED';
        } = {};

        if (filter?.startDate) {
          where.createdAt = { ...where.createdAt, gte: new Date(filter.startDate) };
        }
        if (filter?.endDate) {
          where.createdAt = { ...where.createdAt, lte: new Date(filter.endDate) };
        }
        if (filter?.status) {
          where.status = filter.status;
        }

        // Use Prisma directly with selective fields for optimal performance
        const forms = await prisma.form.findMany({
          where,
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            creatorId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit results for performance
        });

        // Return in the format expected by the AI
        return forms.map((form) => ({
          _id: form.id,
          name: form.name,
          status: form.status,
          createdAt: form.createdAt,
          creatorId: form.creatorId,
        }));
      } catch (error) {
        console.error('Error getting forms:', error);
        return [];
      }
    },
  } as any);
};
