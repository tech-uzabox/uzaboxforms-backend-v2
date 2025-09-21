import { z } from 'zod';

// Message types
export const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  parts: z.array(z.any()),
  experimental_attachments: z.array(z.any()).optional(),
});

export type UIMessage = z.infer<typeof UIMessageSchema>;

// Context types for system prompt
export interface SystemPromptContext {
  selectedChatModel: string;
  roles: Array<{
    _id: string;
    name: string;
  }>;
  groups: Array<{
    _id: string;
    name: string;
  }>;
  users: Array<{
    _id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }>;
}

// Chat model types
export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

// Database message type for saving
export interface DBMessageInput {
  id: string;
  chatId: string;
  role: string;
  parts: any[];
  attachments: any[];
  createdAt: Date;
}

// Tool parameter types
export interface GetFormsFilter {
  startDate?: string;
  endDate?: string;
  status?: 'ENABLED' | 'DISABLED';
}

export interface GetFormResponsesFilter {
  formId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetProcessesFilter {
  startDate?: string;
  endDate?: string;
  status?: 'ENABLED' | 'DISABLED';
  type?: 'PUBLIC' | 'PRIVATE';
}

// Form schema types
export interface GeneratedFormSchema {
  formId: string;
  name: string;
  sections: any;
}

// Process types
export interface ProcessMetadata {
  processId: string;
  name: string;
  type: 'PRIVATE' | 'PUBLIC';
  groupId: string;
  staffViewForms: 'YES' | 'NO';
  applicantViewProcessLevel: 'YES' | 'NO';
}

// Step types
export interface ProcessStepData {
  stepId: string;
  formId: string;
  nextStepType: 'STATIC' | 'DYNAMIC' | 'FOLLOW_ORGANIZATION_CHART' | 'NOT_APPLICABLE';
  nextStepRoles?: string[];
  nextStaff?: string;
  notificationType: 'STATIC' | 'DYNAMIC' | 'FOLLOW_ORGANIZATION_CHART' | 'NOT_APPLICABLE';
  notificationTo?: string;
  notificationComment?: string;
  editApplicationStatus: boolean;
  applicantViewFormAfterCompletion: boolean;
  notifyApplicant: boolean;
  applicantNotificationContent: string;
}
