import { tool } from 'ai';
import { z } from 'zod';
import { FormResponseService } from '../../form-response/form-response.service';

export const createGetFormResponsesTool = (formResponseService: FormResponseService) => {
  return tool({
    description: "Get form responses based on filter criteria",
    parameters: z.object({
      filter: z
        .object({
          formId: z
            .string()
            .describe("the formId of the form to get responses for"),
          startDate: z
            .string()
            .optional()
            .describe(
              "the start date of the responses to get, used to get response after a specific date"
            ),
          endDate: z
            .string()
            .optional()
            .describe(
              "the end date of the responses to get, used to get response before a specific date"
            ),
        })
        .describe(
          "This is the filter object used to customize data to be returned, there is mandatory formId and optional startDate and endDate"
        ),
    }),
    execute: async ({ filter }: any) => {
      try {
        // Get all form responses
        const allResponses = await formResponseService.findAll();

        let filteredResponses = allResponses.filter((response: any) => response.formId === filter.formId);

        if (filter.startDate) {
          const startDate = new Date(filter.startDate);
          filteredResponses = filteredResponses.filter((response: any) => response.createdAt >= startDate);
        }

        if (filter.endDate) {
          const endDate = new Date(filter.endDate);
          filteredResponses = filteredResponses.filter((response: any) => response.createdAt <= endDate);
        }

        // Return in the expected format
        return filteredResponses.map((response: any) => ({
          _id: response.id,
          formId: response.formId,
          applicantProcessId: response.applicantProcessId,
          responses: response.responses,
          createdAt: response.createdAt,
        }));
      } catch (error) {
        console.error('Error getting form responses:', error);
        return [];
      }
    },
  } as any);
};
