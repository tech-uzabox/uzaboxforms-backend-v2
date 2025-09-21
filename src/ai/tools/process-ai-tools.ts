import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';

// Define the schema for GeneratedFormSchema based on the frontend types
const GeneratedFormSchema = z.object({
  formId: z.string(),
  name: z.string(),
  sections: z.any(),
});

export const createGenerateFormTool = () => {
  return tool({
    description: "generate form schema according to description",
    parameters: z.object({
      description: z
        .string()
        .describe(
          "Description of the form to generate a schema from"
        ),
    }),
    execute: async ({ description }: any) => {
      // This would typically call an AI service to generate the form
      // For now, return a placeholder
      const data = {
        formId: `form_${Date.now()}`,
        name: `Generated Form: ${description}`,
        sections: [
          {
            id: 'section_1',
            name: 'Basic Information',
            questions: [
              {
                id: 'name',
                label: 'Full Name',
                type: 'short_text',
                required: true,
              },
              {
                id: 'email',
                label: 'Email Address',
                type: 'email',
                required: true,
              },
            ],
          },
        ],
      };

      return {
        message: `Generated form for description: ${description}`,
        data,
      };
    },
  } as any);
};

export const createSaveFormTool = (prisma: PrismaService) => {
  return tool({
    description: "if satisfied with the form schema, save it",
    parameters: GeneratedFormSchema,
    execute: async (data: any) => {
      try {
        // Save form data to ProcessSave table
        // This would typically update an existing ProcessSave record
        // For now, create a new one or update existing
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' }, // This would come from context
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
              chatId: 'current_chat_id', // This would come from context
              formsData: [data],
            },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createPreviewFormTool = () => {
  return tool({
    description:
      "preview the generated form in the ui for the user to view, always do this before saving the form, used to preview a single form only not multiple forms",
    parameters: GeneratedFormSchema,
    execute: async (data: any) => {
      return {
        name: data.name,
        formId: data.formId,
        sections: data.sections,
      };
    },
  } as any);
};

export const createDeleteFormTool = (prisma: PrismaService) => {
  return tool({
    description: "delete form from save",
    parameters: GeneratedFormSchema,
    execute: async (data: any) => {
      try {
        // Remove form from ProcessSave
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (existingSave && existingSave.formsData) {
          const formsData = existingSave.formsData as any[];
          const updatedFormsData = formsData.filter(
            (form: any) => form.formId !== data.formId
          );

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { formsData: updatedFormsData },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createSaveProcessTool = (prisma: PrismaService) => {
  return tool({
    description: "after defining the process, save its info",
    parameters: z.object({
      name: z.string(),
      type: z.enum(["PRIVATE", "PUBLIC"]),
      groupId: z.string(),
      staffViewForms: z.enum(["YES", "NO"]),
      applicantViewProcessLevel: z.enum(["YES", "NO"]),
    }),
    execute: async (data: any) => {
      try {
        const processData = {
          processId: `process_${Date.now()}`,
          name: data.name,
          type: data.type,
          groupId: data.groupId,
          staffViewForms: data.staffViewForms,
          applicantViewProcessLevel: data.applicantViewProcessLevel,
        };

        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (existingSave) {
          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { processData },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: 'current_chat_id',
              processData,
            },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createSaveRolesTool = (prisma: PrismaService) => {
  return tool({
    description: "save roles linked to the process",
    parameters: z.object({
      roles: z.array(z.string()).describe("Array of role names"),
    }),
    execute: async ({ roles }: any) => {
      try {
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (existingSave) {
          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { rolesData: roles },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: 'current_chat_id',
              rolesData: roles,
            },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createSaveStepTool = (prisma: PrismaService) => {
  return tool({
    description: "save a step in the process",
    parameters: z.object({
      stepId: z.string(),
      formId: z.string(),
      nextStepType: z.enum([
        "STATIC",
        "DYNAMIC",
        "FOLLOW_ORGANIZATION_CHART",
        "NOT_APPLICABLE",
      ]),
      nextStepRoles: z.array(z.string()).optional(),
      nextStaff: z.string().optional(),
      notificationType: z.enum([
        "STATIC",
        "DYNAMIC",
        "FOLLOW_ORGANIZATION_CHART",
        "NOT_APPLICABLE",
      ]),
      notificationTo: z.string().optional(),
      notificationComment: z.string().optional(),
      editApplicationStatus: z.boolean(),
      applicantViewFormAfterCompletion: z.boolean(),
      notifyApplicant: z.boolean(),
      applicantNotificationContent: z.string(),
    }),
    execute: async (input: any) => {
      try {
        const stepData = {
          processId: input.stepId,
          formId: input.formId,
          nextStepType: input.nextStepType,
          nextStepRoles: input.nextStepRoles,
          nextStaff: input.nextStaff,
          notificationType: input.notificationType,
          notificationTo: input.notificationTo,
          notificationComment: input.notificationComment,
          editApplicationStatus: input.editApplicationStatus,
          applicantViewFormAfterCompletion: input.applicantViewFormAfterCompletion,
          notifyApplicant: input.notifyApplicant,
          applicantNotificationContent: input.applicantNotificationContent,
        };

        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (existingSave) {
          const stepsData = (existingSave.stepsData as any[]) || [];
          const updatedStepsData = [...stepsData, stepData];

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { stepsData: updatedStepsData },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: 'current_chat_id',
              stepsData: [stepData],
            },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createDeleteStepTool = (prisma: PrismaService) => {
  return tool({
    description: "delete a step from save",
    parameters: z.object({
      stepId: z.string(),
      formId: z.string(),
      nextStepType: z.enum([
        "STATIC",
        "DYNAMIC",
        "FOLLOW_ORGANIZATION_CHART",
        "NOT_APPLICABLE",
      ]),
      nextStepRoles: z.array(z.string()).optional(),
      nextStaff: z.string().optional(),
      notificationType: z.enum([
        "STATIC",
        "DYNAMIC",
        "FOLLOW_ORGANIZATION_CHART",
        "NOT_APPLICABLE",
      ]),
      notificationTo: z.string().optional(),
      notificationComment: z.string().optional(),
      editApplicationStatus: z.boolean(),
      applicantViewFormAfterCompletion: z.boolean(),
      notifyApplicant: z.boolean(),
      applicantNotificationContent: z.string(),
    }),
    execute: async (input: any) => {
      try {
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (existingSave && existingSave.stepsData) {
          const stepsData = existingSave.stepsData as any[];
          const updatedStepsData = stepsData.filter(
            (step: any) => step.processId !== input.stepId || step.formId !== input.formId
          );

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { stepsData: updatedStepsData },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

export const createProcessTool = (prisma: PrismaService) => {
  return tool({
    description:
      "use all the saved process, roles and steps and create them in the main system",
    parameters: z.object({}),
    execute: async () => {
      try {
        const processSaved = await prisma.processSave.findFirst({
          where: { chatId: 'current_chat_id' },
        });

        if (!processSaved) {
          return {
            message: "no process data saved in sandbox",
          };
        }

        // Here you would typically call the process creation logic
        // For now, return a success message
        return {
          message: "Process created successfully",
          processData: processSaved.processData,
          formsData: processSaved.formsData,
          rolesData: processSaved.rolesData,
          stepsData: processSaved.stepsData,
        };
      } catch (error) {
        return {
          message: "Error creating process",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  } as any);
};
// Add more tools as needed...
