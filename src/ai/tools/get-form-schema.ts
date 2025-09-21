import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';

export const createGetFormSchemaByIdTool = (prisma: PrismaService) => {
  return tool({
    description: 'Get the form schema by ID',
    parameters: z.object({
      id: z.string().describe("the ID of the form to get the schema for"),
    }),
    execute: async ({ id }: { id: string }) => {
      try {
        // Use Prisma directly with selective fields for optimal performance
        const form = await prisma.form.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            design: true,
            createdAt: true,
          },
        });

        if (!form) {
          return null;
        }

        return {
          _id: form.id,
          formId: form.id,
          formName: form.name,
          design: form.design,
          createdAt: form.createdAt,
        };
      } catch (error) {
        console.error('Error getting form schema:', error);
        return null;
      }
    },
  } as any);
};
