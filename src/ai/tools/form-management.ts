import { tool } from 'ai';
import { PrismaService } from '../../db/prisma.service';
import { GeneratedFormData, GeneratedFormSchema } from './form-schemas';

export const createSaveFormTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: 'if satisfied with the form schema, save it',
    parameters: GeneratedFormSchema,
    execute: async (data: any) => {
      try {
        // Save form data to ProcessSave table
        // This would typically update an existing ProcessSave record
        // For now, create a new one or update existing
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId },
        });

        if (existingSave) {
          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: {
              formsData: [data], // This should merge with existing forms
            },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId,
              formsData: [data],
            },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: 'please try again' };
      }
    },
  } as any);
};

export const createPreviewFormTool = tool({
  description:
    'preview the generated form in the ui for the user to view, always do this before saving the form, used to preview a single form only not multiple forms',
  parameters: GeneratedFormSchema,
  execute: async (data: GeneratedFormData) => {
    return {
      name: data.name,
      formId: data.formId,
      sections: data.sections,
    };
  },
} as any);

export const createDeleteFormTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: 'delete form from save',
    parameters: GeneratedFormSchema,
    execute: async (data: GeneratedFormData) => {
      try {
        // Remove form from ProcessSave
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId },
        });

        if (existingSave && existingSave.formsData) {
          const formsData =
            existingSave.formsData as unknown as GeneratedFormData[];
          const updatedFormsData = formsData.filter(
            (form: GeneratedFormData) => form.formId !== data.formId,
          );

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { formsData: updatedFormsData as any },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: 'please try again' };
      }
    },
  } as any);
};
