import { tool } from 'ai';
import { PrismaService } from '../../db/prisma.service';

export const createProcessTool = (prisma: PrismaService, chatId: string, currentUserId: string) => {
  return tool({
    description:
      "use all the saved process, roles and steps and create them in the main system",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
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
            message: "Incomplete process data in sandbox",
          };
        }

        const processData = processSaved.processData as any;
        const formsData = processSaved.formsData as any[];
        const rolesData = processSaved.rolesData as string[];
        const stepsData = (processSaved.stepsData as any[]) || [];

        // Map role names to role IDs
        const roles = await tx.role.findMany({
          where: { name: { in: rolesData } },
          select: { id: true, name: true },
        });
        const roleMap = new Map(roles.map(r => [r.name, r.id]));
        const roleIds = rolesData.map(name => roleMap.get(name)).filter(Boolean);

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
        for (const step of stepsData) {
          const realFormId = formMappings.find(m => m.tempId === step.formId)?.realId;
          if (!realFormId) continue;

          // Map role names to IDs for nextStepRoles and notificationToRoles
          const nextStepRoleIds = step.nextStepRoles?.map(name => roleMap.get(name)).filter(Boolean) || [];
          const notificationRoleIds = step.notificationToRoles?.map(name => roleMap.get(name)).filter(Boolean) || [];

          await tx.processForm.create({
            data: {
              processId: process.id,
              formId: realFormId,
              order: 0, // Will need to calculate proper order
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
    },
  } as any);
};
