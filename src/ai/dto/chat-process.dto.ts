import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  parts: z.array(z.any()),
  experimental_attachments: z.array(z.any()).optional(),
});

export const ChatProcessDtoSchema = z.object({
  id: z.string(),
  messages: z.array(UIMessageSchema),
  selectedChatModel: z.string(),
});

export class ChatProcessDto extends createZodDto(ChatProcessDtoSchema) {}
