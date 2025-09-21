import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { GetFormResponsesFilter } from '../types/ai.types';

export const createGetFormResponsesTool = (prisma: PrismaService) => {
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
    execute: async ({ filter }: { filter: GetFormResponsesFilter }) => {
      try {
        // Build where clause for efficient database filtering
        const where: {
          formId: string;
          createdAt?: { gte?: Date; lte?: Date };
        } = {
          formId: filter.formId,
        };

        if (filter.startDate) {
          where.createdAt = { ...where.createdAt, gte: new Date(filter.startDate) };
        }
        if (filter.endDate) {
          where.createdAt = { ...where.createdAt, lte: new Date(filter.endDate) };
        }

        // Use Prisma directly with selective fields for optimal performance
        const responses = await prisma.formResponse.findMany({
          where,
          select: {
            id: true,
            formId: true,
            applicantProcessId: true,
            responses: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit results for performance
        });

        // Return in the expected format
        return responses.map((response) => ({
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
