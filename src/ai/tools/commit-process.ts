import { tool } from 'ai';
import z from 'zod';
import { PrismaService } from '../../db/prisma.service';
import { SectionSchemaV2 } from './form-schemas';

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

export const StepDataSchema = z.object({
  formId: z.string(),
  nextStepType: z.enum([
    'STATIC',
    'DYNAMIC',
    'FOLLOW_ORGANIZATION_CHART',
    'NOT_APPLICABLE',
  ]),
  nextStepRoles: z.array(z.string()).optional(),
  nextStaff: z.string().optional(),
  notificationType: z.enum([
    'STATIC',
    'DYNAMIC',
    'FOLLOW_ORGANIZATION_CHART',
    'NOT_APPLICABLE',
  ]),
  notificationTo: z.string().optional(),
  notificationToRoles: z.array(z.string()).optional(),  // Fixed: was notificationRoles
  notificationComment: z.string().optional(),
  editApplicationStatus: z.boolean(),
  applicantViewFormAfterCompletion: z.boolean(),
  notifyApplicant: z.boolean(),
  applicantNotificationContent: z.string(),
});

const RolesDataSchema = z.array(z.string().min(1));

export const createProcessTool = (
  prisma: PrismaService,
  chatId: string,
  currentUserId: string,
): any => {
  return tool({
    description:
      'use all the saved process, roles and steps and create them in the main system',
    parameters: z.object({}),
    execute: async () => {
      try {
        return await prisma.$transaction(async (tx) => {
          console.log('DEBUG: Fetching saved process data for chatId:', chatId);
          const processSaved = await tx.processSave.findFirst({
            where: { chatId: chatId },
          });
          console.log('DEBUG: processSaved found:', !!processSaved);

          if (!processSaved) {
            return {
              message: 'no process data saved in sandbox',
              success: false,
            };
          }

          // Validate data
          console.log('DEBUG: Validating presence of required data fields');
          if (
            !processSaved.processData ||
            !processSaved.formsData ||
            !processSaved.rolesData
          ) {
            return {
              message:
                'Incomplete process data in sandbox: missing process, forms, or roles data',
            };
          }

          // Validate process data with Zod
          console.log('DEBUG: Validating process data with Zod schema');
          const processValidation = ProcessDataSchema.safeParse(
            processSaved.processData,
          );
          console.log(
            'DEBUG: Process validation success:',
            processValidation.success,
          );
          if (!processValidation.success) {
            return {
              message: `Invalid process data: ${processValidation.error.errors.map((e) => e.message).join(', ')}`,
              success: false,
            };
          }
          const processData = processValidation.data;

          // Validate forms data
          console.log(
            'DEBUG: Validating forms data - isArray and length check',
          );
          if (
            !Array.isArray(processSaved.formsData) ||
            processSaved.formsData.length === 0
          ) {
            return {
              message: 'No forms data found in sandbox',
              success: false,
            };
          }
          console.log('DEBUG: Validating forms data with Zod schema');
          const formsValidation = z
            .array(FormDataSchema)
            .safeParse(processSaved.formsData);
          console.log(
            'DEBUG: Forms validation success:',
            formsValidation.success,

          );
          if (!formsValidation.success) {
            return {
              message: `Invalid forms data: ${formsValidation.error.errors.map((e) => e.message).join(', ')}`,
              success: false,
            };
          }
          const formsData = formsValidation.data;
          console.log('DEBUG: Forms data validated, count:', formsData.length);

          // Validate roles data
          console.log('DEBUG: Validating roles data with Zod schema');
          const rolesValidation = RolesDataSchema.safeParse(
            processSaved.rolesData,
          );
          console.log(
            'DEBUG: Roles validation success:',
            rolesValidation.success,
          );
          if (!rolesValidation.success) {
            return {
              message: `Invalid roles data: ${rolesValidation.error.errors.map((e) => e.message).join(', ')}`,
              success: false,
            };
          }
          const rolesData = rolesValidation.data;
          console.log('DEBUG: Roles data validated, count:', rolesData.length);

          // Validate steps data
          console.log(
            'DEBUG: Validating steps data - isArray and length check',
          );
          if (
            !Array.isArray(processSaved.stepsData) ||
            processSaved.stepsData.length === 0
          ) {
            return {
              message: 'No steps data found in sandbox',
              success: false,
            };
          }
          console.log('DEBUG: Validating steps data with Zod schema');
          const stepsValidation = z
            .array(StepDataSchema)
            .safeParse(processSaved.stepsData);
          console.log(
            'DEBUG: Steps validation success:',
            stepsValidation.success,
          );
          console.dir(processSaved.stepsData, { depth: null });
          console.dir(stepsValidation.error, { depth: null });
          if (!stepsValidation.success) {
            return {
              message: `Invalid steps data: ${stepsValidation.error.errors.map((e) => e.message).join(', ')}`,
              success: false,
            };
          }
          const stepsData = stepsValidation.data;
          console.log('DEBUG: Steps data validated, count:', stepsData.length);

          // Validate that all steps reference existing forms
          console.log('DEBUG: Validating steps reference existing forms');
          const formIds = formsData.map((f) => f.formId);
          console.log('DEBUG: Form IDs from sandbox:', formIds);
          const missingForms = stepsData.filter(
            (step) => !formIds.includes(step.formId),
          );
          console.log('DEBUG: Missing forms count:', missingForms.length);
          if (missingForms.length > 0) {
            return {
              message: `Steps reference forms that don't exist in sandbox: ${missingForms.map((s) => s.formId).join(', ')}`,
              success: false,
            };
          }
          console.log('DEBUG: Form references validated');

          // Validate group exists
          console.log(
            'DEBUG: Validating group exists, groupId:',
            processData.groupId,
          );
          const group = await tx.group.findUnique({
            where: { id: processData.groupId },
            select: { id: true },
          });
          console.log('DEBUG: Group found:', !!group);
          if (!group) {
            return {
              message: `Group with ID ${processData.groupId} does not exist`,
              success: false,
            };
          }

          // Map role names to role IDs
          console.log(
            'DEBUG: Mapping role names to role IDs, rolesData:',
            rolesData,
          );
          const roles = await tx.role.findMany({
            where: { name: { in: rolesData } },
            select: { id: true, name: true },
          });
          console.log('DEBUG: Found roles count:', roles.length);
          const roleMap = new Map(roles.map((r) => [r.name, r.id]));
          const roleIds = rolesData
            .map((name) => roleMap.get(name))
            .filter(Boolean);
          console.log(
            'DEBUG: Mapped role IDs:',
            roleIds.length,
            'of',
            rolesData.length,
          );

          // Check if all roles were found
          console.log('DEBUG: Checking if all roles were found');
          if (roleIds.length !== rolesData.length) {
            const missingRoles = rolesData.filter((name) => !roleMap.has(name));
            console.log('DEBUG: Missing roles:', missingRoles);
            return {
              message: `Some roles do not exist: ${missingRoles.join(', ')}`,
              success: false,
            };
          }
          console.log('DEBUG: All required roles found');

          // Create forms first
          console.log('DEBUG: Starting forms creation');
          const formMappings: { tempId: string; realId: string }[] = [];
          for (const form of formsData) {
            console.log(
              'DEBUG: Creating form:',
              form.name,
              'with tempId:',
              form.formId,
            );
            // Create form name
            const formName = await tx.form.create({
              data: {
                name: form.name,
                creatorId: currentUserId,
                type: 'INTERNAL',
                status: 'ENABLED',
              },
            });
            console.log('DEBUG: Form created with real ID:', formName.id);

            // Create form design
            await tx.form.update({
              where: { id: formName.id },
              data: {
                design: form.sections,
              },
            });
            console.log('DEBUG: Form design updated');

            formMappings.push({ tempId: form.formId, realId: formName.id });
          }
          console.log(
            'DEBUG: Forms creation completed, mappings:',
            formMappings.length,
          );

          // Create process
          console.log('DEBUG: Creating process:', processData.name);
          const process = await tx.process.create({
            data: {
              name: processData.name,
              type: processData.type,
              groupId: processData.groupId,
              creatorId: currentUserId,
              staffViewForms: processData.staffViewForms === 'YES',
              applicantViewProcessLevel:
                processData.applicantViewProcessLevel === 'YES',
              status: 'ENABLED',
            },
          });
          console.log('DEBUG: Process created with ID:', process.id);

          // Create process roles
          console.log('DEBUG: Creating process roles');
          for (const roleId of roleIds) {
            console.log('DEBUG: Creating process role for roleId:', roleId);
            await tx.processRole.create({
              data: {
                processId: process.id,
                roleId: roleId as string,
              },
            });
          }
          console.log('DEBUG: Process roles created');

          // Create process forms (steps)
          console.log('DEBUG: Creating process forms (steps)');
          for (let i = 0; i < stepsData.length; i++) {
            const step = stepsData[i];
            console.log('DEBUG: Creating step', i, 'for formId:', step.formId);
            const realFormId = formMappings.find(
              (m) => m.tempId === step.formId,
            )?.realId;
            console.log('DEBUG: Real form ID for step:', realFormId);
            if (!realFormId) {
              console.log('DEBUG: Skipping step due to missing real form ID');
              continue;
            }

            // Map role names to IDs for nextStepRoles and notificationToRoles
            const nextStepRoleIds =
              step.nextStepRoles
                ?.map((name) => roleMap.get(name))
                .filter((id): id is string => id !== undefined) || [];
            const notificationRoleIds =
              step.notificationToRoles
                ?.map((name) => roleMap.get(name))
                .filter((id): id is string => id !== undefined) || [];
            console.log(
              'DEBUG: Mapped nextStepRoleIds:',
              nextStepRoleIds.length,
              'notificationRoleIds:',
              notificationRoleIds.length,
            );

            await tx.processForm.create({
               data: {
                 processId: process.id,
                 formId: realFormId,
                 order: i,
                 nextStepType: step.nextStepType,
                 nextStepRoles: nextStepRoleIds,
                 nextStaffId: step.nextStaff,
                 notificationType: step.notificationType,
                 notificationRoles: notificationRoleIds,
                 notificationToId: step.notificationTo,
                 notificationComment: step.notificationComment,
                 notifyApplicant: step.notifyApplicant,
                 applicantNotificationContent: step.applicantNotificationContent,
                 editApplicationStatus: step.editApplicationStatus,
                 applicantViewFormAfterCompletion:
                   step.applicantViewFormAfterCompletion,
               },
             });
            console.log('DEBUG: Step created successfully');
          }
          console.log('DEBUG: All steps created');

          // Clean up the sandbox data
          console.log('DEBUG: Cleaning up sandbox data');
          await tx.processSave.delete({
            where: { id: processSaved.id },
          });
          console.log('DEBUG: Sandbox data cleaned up');

          return {
            message: 'Process created successfully in main system',
            processId: process.id,
            success: true,
          };
        });
      } catch (error) {
        console.error('Error creating process:', error);
        return {
          message: 'Error creating process. Please try again.',
          errors: error?.message,
        };
      }
    },
  } as any);
};
