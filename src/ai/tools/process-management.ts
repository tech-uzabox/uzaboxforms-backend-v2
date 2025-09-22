import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { ProcessData, RolesData, StepData, StoredStepData } from './form-schemas';
import { StepDataSchema } from './commit-process';
import { ProcessForm } from 'src/generated/prisma';
import { ProcessStepData } from '../types/ai.types';

export const createSaveProcessTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: "after defining the process, save its info",
    parameters: z.object({
      name: z.string(),
      type: z.enum(["PRIVATE", "PUBLIC"]),
      groupId: z.string(),
      staffViewForms: z.enum(["YES", "NO"]),
      applicantViewProcessLevel: z.enum(["YES", "NO"]),
    }),
    execute: async (data: ProcessData) => {
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
          where: { chatId: chatId },
        });

        if (existingSave) {
          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { processData },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: chatId,
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

export const createSaveRolesTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: "save roles linked to the process",
    parameters: z.object({
      roles: z.array(z.string()).describe("Array of role names"),
    }),
    execute: async ({ roles }: RolesData) => {
      try {
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: chatId },
        });

        if (existingSave) {
          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { rolesData: roles },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: chatId,
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

export const createSaveStepTool = (prisma: PrismaService, chatId: string) => {
  return tool({
    description: "save a step in the process",
    parameters: StepDataSchema,
    execute: async (input: StepData) => {
      try {
        const stepData = {
          processId: input.stepId,
          formId: input.formId,
          nextStepType: input.nextStepType,
          nextStepRoles: input.nextStepRoles,
          nextStaff: input.nextStaff,
          nextStepSpecifiedTo: input.nextStepSpecifiedTo,
          notificationType: input.notificationType,
          notificationTo: input.notificationTo,
          notificationRoles: input.notificationRoles,
          notificationComment: input.notificationComment,
          editApplicationStatus: input.editApplicationStatus,
          applicantViewFormAfterCompletion: input.applicantViewFormAfterCompletion,
          notifyApplicant: input.notifyApplicant,
          applicantNotificationContent: input.applicantNotificationContent,
        };

        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: chatId },
        });

        if (existingSave) {
          const stepsData = (existingSave.stepsData as unknown as StoredStepData[]) || [];
          const updatedStepsData = [...stepsData, stepData];

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { stepsData: updatedStepsData as any },
          });
        } else {
          await prisma.processSave.create({
            data: {
              chatId: chatId,
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

export const createDeleteStepTool = (prisma: PrismaService, chatId: string) => {
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
      nextStepSpecifiedTo: z.string().optional(),
      notificationType: z.enum([
        "STATIC",
        "DYNAMIC",
        "FOLLOW_ORGANIZATION_CHART",
        "NOT_APPLICABLE",
      ]),
      notificationTo: z.string().optional(),
      notificationRoles: z.array(z.string()).optional(),
      notificationComment: z.string().optional(),
      editApplicationStatus: z.boolean(),
      applicantViewFormAfterCompletion: z.boolean(),
      notifyApplicant: z.boolean(),
      applicantNotificationContent: z.string(),
    }),
    execute: async (input: StepData) => {
      try {
        const existingSave = await prisma.processSave.findFirst({
          where: { chatId: chatId },
        });

        if (existingSave && existingSave.stepsData) {
          const stepsData = existingSave.stepsData as unknown as StoredStepData[];
          const updatedStepsData = stepsData.filter(
            (step: StoredStepData) => step.processId !== input.stepId || step.formId !== input.formId
          );

          await prisma.processSave.update({
            where: { id: existingSave.id },
            data: { stepsData: updatedStepsData as any },
          });
        }

        return { success: true };
      } catch (error) {
        return { success: false, message: "please try again" };
      }
    },
  } as any);
};

function handleStepsDataUpdate(
  newStepData: ProcessStepData,
  existingStepsData: ProcessStepData[] | null | undefined
): ProcessStepData[] {
  if (!existingStepsData?.length) {
    return [newStepData];
  }

  const isExistingStep = existingStepsData.some(
    (step) =>
      step.formId === newStepData.formId &&
      step.processId === newStepData.processId
  );

  if (isExistingStep) {
    return existingStepsData.map((step) =>
      step.formId === newStepData.formId &&
      step.processId === newStepData.processId
        ? newStepData
        : step
    );
  }

  return [...existingStepsData, newStepData];
}

/**
 * Updates forms data by either replacing matching items or adding new ones
 */
function handleFormsDataUpdate(
  newFormData: ProcessForm,
  existingFormsData: ProcessForm[] | null | undefined
): ProcessForm[] {
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
