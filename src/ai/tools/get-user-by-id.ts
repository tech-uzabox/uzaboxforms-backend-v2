import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';

export const createGetUserByIdTool = (prisma: PrismaService) => {
  return tool({
    description: "get information about a specific user or applicant",
    parameters: z.object({
      userId: z.string().describe("this is the userId or id of the user"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      try {
        // Use Prisma directly with selective fields for optimal performance
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });

        if (!user) {
          return null;
        }

        return {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };
      } catch (error) {
        console.error('Error getting user by ID:', error);
        return null;
      }
    },
  } as any);
};
