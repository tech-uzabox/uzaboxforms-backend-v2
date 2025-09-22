import { tool } from 'ai';
import { PrismaService } from '../../db/prisma.service';
import { GeneratedFormData, GeneratedFormSchema } from './form-schemas';

interface SavedProcessForm {
  formId: string;
  name: string;
  sections: any;
}

/**
 * Updates forms data by either replacing matching items or adding new ones
 */
function handleFormsDataUpdate(
  newFormData: SavedProcessForm,
  existingFormsData: SavedProcessForm[] | null | undefined
): SavedProcessForm[] {
  if (!existingFormsData?.length) {
    return [newFormData];
  }

  const isExistingForm = existingFormsData.some(
    (form) => form.formId === newFormData.formId
  );

  if (isExistingForm) {
    return existingFormsData.map((form) =>
      form.formId === newFormData.formId ? newFormData : form
    );
  }

  return [...existingFormsData, newFormData];
}

export const createSaveFormTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: 'if satisfied with the form schema, save it',
    parameters: GeneratedFormSchema,
    execute: async (data: any) => {
      try {
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId },
        });

        const formData = {
          formId: data.formId,
          name: data.name,
          sections: data.sections,
        };

        if (existingSave) {
          const formsData = (existingSave.formsData as unknown as SavedProcessForm[]) || [];
          const updatedFormsData = handleFormsDataUpdate(formData, formsData);

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: {
              formsData: updatedFormsData as any,
            },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId,
              formsData: [formData] as any,
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
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId },
        });

        if (existingSave && existingSave.formsData) {
          const formsData = existingSave.formsData as unknown as SavedProcessForm[];
          const updatedFormsData = formsData.filter(
            (form: SavedProcessForm) => form.formId !== data.formId,
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
