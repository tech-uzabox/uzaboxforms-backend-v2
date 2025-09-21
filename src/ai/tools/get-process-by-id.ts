import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';

export const createGetProcessByIdTool = (prisma: PrismaService) => {
  return tool({
    description:
      "get information about a specific process, the information include process forms, applications and their completed forms",
    parameters: z.object({
      processId: z
        .string()
        .describe(
          "this is the processId or id of the process, it is used to fetch information about the process like forms, applications and their completed forms"
        ),
    }),
    execute: async ({ processId }: { processId: string }) => {
      try {
        // Get process with forms using Prisma directly
        const process = await prisma.process.findUnique({
          where: { id: processId },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            forms: {
              select: {
                id: true,
                formId: true,
                order: true,
                form: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!process) {
          return null;
        }

        // Get applicant processes with completed forms and responses in a single query
        const applicantProcesses = await prisma.applicantProcess.findMany({
          where: { processId },
          select: {
            id: true,
            applicantId: true,
            status: true,
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            completedForms: {
              select: {
                id: true,
                formId: true,
                reviewerId: true,
                createdAt: true,
              },
            },
            responses: {
              select: {
                id: true,
                formId: true,
                responses: true,
                createdAt: true,
              },
              take: 10, // Limit responses for performance
            },
          },
          take: 20, // Limit applications for performance
        });

        return {
          _id: process.id,
          name: process.name,
          type: process.type,
          status: process.status,
          forms: process.forms.map((pf) => ({
            id: pf.id,
            formId: pf.formId,
            order: pf.order,
            formName: pf.form?.name,
          })),
          applications: applicantProcesses.map((ap) => ({
            _id: ap.id,
            applicantId: ap.applicantId,
            status: ap.status,
            applicant: {
              firstName: ap.applicant?.firstName,
              lastName: ap.applicant?.lastName,
              email: ap.applicant?.email,
            },
            completedForms: ap.completedForms,
            responses: ap.responses,
          })),
        };
      } catch (error) {
        console.error('Error getting process by ID:', error);
        return null;
      }
    },
  } as any);
};
