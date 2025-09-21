import { tool } from 'ai';
import { z } from 'zod';
import { FormService } from '../../form/form.service';

export const createGetFormsTool = (formService: FormService) => {
  return tool({
    description: 'Get forms based on filter criteria',
    parameters: z.object({
      filter: z.object({
        startDate: z.string().optional().describe("the start date of the forms to get, used to get form after a specific date"),
        endDate: z.string().optional().describe("the end date of the forms to get, used to get form before a specific date"),
        status: z.enum(['ENABLED', 'DISABLED']).optional().describe("")
      }).optional().describe("This is the filter object used to customize data to be returned, there is optional startDate, endDate and status"),
    }),
    execute: async ({ filter }: any) => {
      try {
        // Get all forms and apply filters
        const allForms = await formService.findAll();

        let filteredForms = allForms;

        if (filter?.startDate) {
          const startDate = new Date(filter.startDate);
          filteredForms = filteredForms.filter((form: any) => form.createdAt >= startDate);
        }

        if (filter?.endDate) {
          const endDate = new Date(filter.endDate);
          filteredForms = filteredForms.filter((form: any) => form.createdAt <= endDate);
        }

        if (filter?.status) {
          filteredForms = filteredForms.filter((form: any) => form.status === filter.status);
        }

        // Return in the format expected by the AI
        return filteredForms.map((form: any) => ({
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
