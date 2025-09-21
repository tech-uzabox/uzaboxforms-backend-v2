import { tool } from 'ai';
import { z } from 'zod';
import { ProcessService } from '../../process/process.service';

export const createGetProcessesTool = (processService: ProcessService) => {
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
    execute: async ({ filter }: any) => {
      try {
        const allProcesses = await processService.findAll();

        let filteredProcesses = allProcesses;

        if (filter?.startDate) {
          const startDate = new Date(filter.startDate);
          filteredProcesses = filteredProcesses.filter((process: any) => process.createdAt >= startDate);
        }

        if (filter?.endDate) {
          const endDate = new Date(filter.endDate);
          filteredProcesses = filteredProcesses.filter((process: any) => process.createdAt <= endDate);
        }

        if (filter?.status) {
          filteredProcesses = filteredProcesses.filter((process: any) => process.status === filter.status);
        }

        if (filter?.type) {
          filteredProcesses = filteredProcesses.filter((process: any) => process.type === filter.type);
        }

        return filteredProcesses.map((process: any) => ({
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
