import { tool } from 'ai';
import { z } from 'zod';
import { FormService } from '../../form/form.service';

export const createGetFormSchemaByIdTool = (formService: FormService) => {
  return tool({
    description: 'Get the form schema by ID',
    parameters: z.object({
      id: z.string().describe("the ID of the form to get the schema for"),
    }),
    execute: async ({ id }: any) => {
      try {
        const form = await formService.findOne(id);
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
