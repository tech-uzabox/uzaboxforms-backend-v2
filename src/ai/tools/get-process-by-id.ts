import { tool } from 'ai';
import { z } from 'zod';
import { ProcessService } from '../../process/process.service';
import { PrismaService } from '../../db/prisma.service';
import { FormResponseService } from '../../form-response/form-response.service';

export const createGetProcessByIdTool = (
  processService: ProcessService,
  prismaService: PrismaService,
  formResponseService: FormResponseService
) => {
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
    execute: async ({ processId }: any) => {
      try {
        const process = await processService.findOne(processId);
        if (!process) {
          return null;
        }

        // Get applicant processes for this process using Prisma directly
        const applicantProcesses = await prismaService.applicantProcess.findMany({
          where: { processId },
          include: {
            applicant: true,
            completedForms: true,
          },
        });

        // For each applicant process, get completed forms and responses
        for (const applicantProcess of applicantProcesses) {
          // For each completed form, get the response
          for (const completedForm of applicantProcess.completedForms) {
            try {
              const response = await formResponseService.findByUserIdAndFormId(
                applicantProcess.applicantId,
                completedForm.formId,
                applicantProcess.id
              );

              if (response && response.responses && response.responses.length > 0) {
                (completedForm as any).response = response.responses[0];
              }
            } catch (error) {
              console.error('Error fetching response for completed form:', error);
            }
          }
        }

        return {
          _id: process.id,
          name: process.name,
          type: process.type,
          status: process.status,
          forms: (process as any).forms?.map((pf: any) => ({
            ...pf,
            formName: pf.form?.name,
          })),
          applications: applicantProcesses.map((ap: any) => ({
            _id: ap.id,
            applicantId: ap.applicantId,
            status: ap.status,
            applicant: {
              firstName: ap.applicant?.firstName,
              lastName: ap.applicant?.lastName,
              email: ap.applicant?.email,
            },
            completedForms: ap.completedForms,
          })),
        };
      } catch (error) {
        console.error('Error getting process by ID:', error);
        return null;
      }
    },
  } as any);
};
