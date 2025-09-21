import { tool } from 'ai';
import { z } from 'zod';
import { ProcessService } from '../../process/process.service';

export const createGetProcessesWithFormIdTool = (processService: ProcessService) => {
  return tool({
    description: "get list of processes with specific formId",
    parameters: z.object({
      formId: z
        .string()
        .describe(
          "specifying this will help you find the process with a specific formId, it will help you understand which process the form is in so that you can answer the question about that process"
        ),
    }),
    execute: async ({ formId }: any) => {
      try {
        const allProcesses = await processService.findAll();

        // Filter processes that contain the specified formId
        const processesWithForm = allProcesses.filter((process: any) =>
          process.forms?.some((formRelation: any) => formRelation.form?.id === formId)
        );

        return processesWithForm.map((process: any) => ({
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
