import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { GetProcessesFilter } from '../types/ai.types';

export const createGetProcessesTool = (prisma: PrismaService) => {
  return tool({
    description: 'Get processes based on filter criteria',
    parameters: z.object({
      filter: z.object({
        startDate: z.string().optional().describe("the start date of the processes to get, used to get process after a specific date"),
        endDate: z.string().optional().describe("the end date of the processes to get, used to get process before a specific date"),
        status: z.enum(['ENABLED', 'DISABLED']).optional().describe(""),
        type: z.enum(['PUBLIC', 'PRIVATE']).optional().describe(""),
      }).optional().describe("This is the filter object used to customize data to be returned, there is optional startDate, endDate, status and type"),
    }),
    execute: async ({ filter }: { filter?: GetProcessesFilter }) => {
      try {
        // Build where clause for efficient database filtering
        const where: {
          createdAt?: { gte?: Date; lte?: Date };
          status?: 'ENABLED' | 'DISABLED';
          type?: 'PUBLIC' | 'PRIVATE';
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
        if (filter?.type) {
          where.type = filter.type;
        }

        // Use Prisma directly with selective fields for optimal performance
        const processes = await prisma.process.findMany({
          where,
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
            creatorId: true,
            groupId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit results for performance
        });

        return processes.map((process) => ({
          _id: process.id,
          name: process.name,
          type: process.type,
          status: process.status,
          createdAt: process.createdAt,
          creatorId: process.creatorId,
          groupId: process.groupId,
        }));
      } catch (error) {
        console.error('Error getting processes:', error);
        return [];
      }
    },
  } as any);
};
