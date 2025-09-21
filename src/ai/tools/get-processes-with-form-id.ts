import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';

export const createGetProcessesWithFormIdTool = (prisma: PrismaService) => {
  return tool({
    description: "get list of processes with specific formId",
    parameters: z.object({
      formId: z
        .string()
        .describe(
          "specifying this will help you find the process with a specific formId, it will help you understand which process the form is in so that you can answer the question about that process"
        ),
    }),
    execute: async ({ formId }: { formId: string }) => {
      try {
        // Use Prisma with join to find processes containing the specific form
        const processes = await prisma.process.findMany({
          where: {
            forms: {
              some: {
                formId: formId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            groupId: true,
            creatorId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20, // Limit results for performance
        });

        return processes.map((process) => ({
          _id: process.id,
          name: process.name,
          type: process.type,
          status: process.status,
          groupId: process.groupId,
          creatorId: process.creatorId,
        }));
      } catch (error) {
        console.error('Error getting processes with form ID:', error);
        return [];
      }
    },
  } as any);
};
