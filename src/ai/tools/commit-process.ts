import { tool } from 'ai';
import { PrismaService } from '../../db/prisma.service';
import z from 'zod';
import { ProcessData, GeneratedFormData, StepData, RolesData, SectionSchemaV2 } from './form-schemas';

// Zod schemas for validation
const ProcessDataSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['PRIVATE', 'PUBLIC']),
  groupId: z.string().uuid(),
  staffViewForms: z.enum(['YES', 'NO']),
  applicantViewProcessLevel: z.enum(['YES', 'NO']),
});

const FormDataSchema = z.object({
  formId: z.string(),
  name: z.string().min(1),
  sections: z.array(SectionSchemaV2), // Keep flexible for now
});

const StepDataSchema = z.object({
  stepId: z.string(),
  formId: z.string(),
  nextStepType: z.enum(['STATIC', 'DYNAMIC', 'FOLLOW_ORGANIZATION_CHART', 'NOT_APPLICABLE']),
  nextStepRoles: z.array(z.string()).optional(),
  nextStaff: z.string().optional(),
  nextStepSpecifiedTo: z.string().optional(),
  notificationType: z.enum(['STATIC', 'DYNAMIC', 'FOLLOW_ORGANIZATION_CHART', 'NOT_APPLICABLE']),
  notificationTo: z.string().optional(),
  notificationRoles: z.array(z.string()).optional(),
  notificationComment: z.string().optional(),
  editApplicationStatus: z.boolean(),
  applicantViewFormAfterCompletion: z.boolean(),
  notifyApplicant: z.boolean(),
  applicantNotificationContent: z.string(),
});

const RolesDataSchema = z.array(z.string().min(1));

export const createProcessTool = (prisma: PrismaService, chatId: string, currentUserId: string) => {
  return tool({
    description:
      "use all the saved process, roles and steps and create them in the main system",
    execute: async () => {
      try {
return await prisma.$transaction(async (tx) => {
        const processSaved = await tx.processSave.findFirst({
          where: { chatId: chatId },
        });

        if (!processSaved) {
          return {
            message: "no process data saved in sandbox",
          };
        }

        // Validate data
        if (!processSaved.processData || !processSaved.formsData || !processSaved.rolesData) {
          return {
            message: "Incomplete process data in sandbox: missing process, forms, or roles data",
          };
        }

        // Validate process data with Zod
        const processValidation = ProcessDataSchema.safeParse(processSaved.processData);
        if (!processValidation.success) {
          return {
            message: `Invalid process data: ${processValidation.error.errors.map(e => e.message).join(', ')}`,
          };
        }
        const processData = processValidation.data;

        // Validate forms data
        if (!Array.isArray(processSaved.formsData) || processSaved.formsData.length === 0) {
          return {
            message: "No forms data found in sandbox",
          };
        }
        const formsValidation = z.array(FormDataSchema).safeParse(processSaved.formsData);
        if (!formsValidation.success) {
          return {
            message: `Invalid forms data: ${formsValidation.error.errors.map(e => e.message).join(', ')}`,
          };
        }
        const formsData = formsValidation.data;

        // Validate roles data
        const rolesValidation = RolesDataSchema.safeParse(processSaved.rolesData);
        if (!rolesValidation.success) {
          return {
            message: `Invalid roles data: ${rolesValidation.error.errors.map(e => e.message).join(', ')}`,
          };
        }
        const rolesData = rolesValidation.data;

        // Validate steps data
        if (!Array.isArray(processSaved.stepsData) || processSaved.stepsData.length === 0) {
          return {
            message: "No steps data found in sandbox",
          };
        }
        const stepsValidation = z.array(StepDataSchema).safeParse(processSaved.stepsData);
        if (!stepsValidation.success) {
          return {
            message: `Invalid steps data: ${stepsValidation.error.errors.map(e => e.message).join(', ')}`,
          };
        }
        const stepsData = stepsValidation.data;

        // Validate that all steps reference existing forms
        const formIds = formsData.map(f => f.formId);
        const missingForms = stepsData.filter(step => !formIds.includes(step.formId));
        if (missingForms.length > 0) {
          return {
            message: `Steps reference forms that don't exist in sandbox: ${missingForms.map(s => s.formId).join(', ')}`,
          };
        }

        // Validate group exists
        const group = await tx.group.findUnique({
          where: { id: processData.groupId },
          select: { id: true },
        });
        if (!group) {
          return {
            message: `Group with ID ${processData.groupId} does not exist`,
          };
        }

        // Map role names to role IDs
        const roles = await tx.role.findMany({
          where: { name: { in: rolesData } },
          select: { id: true, name: true },
        });
        const roleMap = new Map(roles.map(r => [r.name, r.id]));
        const roleIds = rolesData.map(name => roleMap.get(name)).filter(Boolean);

        // Check if all roles were found
        if (roleIds.length !== rolesData.length) {
          const missingRoles = rolesData.filter(name => !roleMap.has(name));
          return {
            message: `Some roles do not exist: ${missingRoles.join(', ')}`,
          };
        }

        // Create forms first
        const formMappings: { tempId: string; realId: string }[] = [];
        for (const form of formsData) {
          // Create form name
          const formName = await tx.form.create({
            data: {
              name: form.name,
              creatorId: currentUserId,
              type: 'INTERNAL',
              status: 'ENABLED',
            },
          });

          // Create form design
          await tx.form.update({
            where: { id: formName.id },
            data: {
              design: form.sections,
            },
          });

          formMappings.push({ tempId: form.formId, realId: formName.id });
        }

        // Create process
        const process = await tx.process.create({
          data: {
            name: processData.name,
            type: processData.type,
            groupId: processData.groupId,
            creatorId: currentUserId,
            staffViewForms: processData.staffViewForms === 'YES',
            applicantViewProcessLevel: processData.applicantViewProcessLevel === 'YES',
            status: 'ENABLED',
          },
        });

        // Create process roles
        for (const roleId of roleIds) {
          await tx.processRole.create({
            data: {
              processId: process.id,
              roleId: roleId as string,
            },
          });
        }

        // Create process forms (steps)
        for (let i = 0; i < stepsData.length; i++) {
          const step = stepsData[i];
          const realFormId = formMappings.find(m => m.tempId === step.formId)?.realId;
          if (!realFormId) continue;

          // Map role names to IDs for nextStepRoles and notificationRoles
          const nextStepRoleIds = step.nextStepRoles?.map(name => roleMap.get(name)).filter((id): id is string => id !== undefined) || [];
          const notificationRoleIds = step.notificationRoles?.map(name => roleMap.get(name)).filter((id): id is string => id !== undefined) || [];

          await tx.processForm.create({
            data: {
              processId: process.id,
              formId: realFormId,
              order: i,
              nextStepType: step.nextStepType,
              nextStepRoles: nextStepRoleIds,
              nextStaffId: step.nextStaff,
              nextStepSpecifiedTo: step.nextStepSpecifiedTo,
              notificationType: step.notificationType,
              notificationRoles: notificationRoleIds,
              notificationToId: step.notificationTo,
              notificationComment: step.notificationComment,
              notifyApplicant: step.notifyApplicant,
              applicantNotificationContent: step.applicantNotificationContent,
              editApplicationStatus: step.editApplicationStatus,
              applicantViewFormAfterCompletion: step.applicantViewFormAfterCompletion,
            },
          });
        }

        // Clean up the sandbox data
        await tx.processSave.delete({
          where: { id: processSaved.id },
        });

        return {
          message: "Process created successfully in main system",
          processId: process.id,
        };
      });
      } catch(error) {
        console.error("Error creating process:", error);
        return {
          message: "Error creating process. Please try again.",
          errors: error?.message
        };
      }

    },
  } as any);
};
