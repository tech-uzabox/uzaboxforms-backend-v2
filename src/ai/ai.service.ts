import { Injectable, Logger } from '@nestjs/common';
import { generateId, streamText } from 'ai';
import { Observable } from 'rxjs';
import { PrismaService } from '../db/prisma.service';
import { ChatProcessDto } from './dto/chat-process.dto';
import { systemPrompt } from './prompts';
import { myProvider } from './providers';
import {
  createDeleteFormTool,
  createDeleteStepTool,
  createGenerateFormTool,
  createPreviewFormTool,
  createProcessTool,
  createSaveFormTool,
  createSaveProcessTool,
  createSaveRolesTool,
  createSaveStepTool,
} from './tools';
import { createChartVisualization } from './tools/create-visualization';
import { createGetFormResponsesTool } from './tools/get-form-responses';
import { createGetFormSchemaByIdTool } from './tools/get-form-schema';
import { createGetFormsTool } from './tools/get-forms';
import { createGetProcessByIdTool } from './tools/get-process-by-id';
import { createGetProcessesTool } from './tools/get-processes';
import { createGetProcessesWithFormIdTool } from './tools/get-processes-with-form-id';
import { createGetUserByIdTool } from './tools/get-user-by-id';
import { DBMessageInput } from './types/ai.types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  async processChat(
    dto: ChatProcessDto,
    currentUser: { id: string },
  ): Promise<Observable<MessageEvent>> {
    const { id, messages, selectedChatModel } = dto;

    // Check if chat exists, create if not
    let chat = await this.prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      // Generate title from first user message
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const title = firstUserMessage
        ? await this.generateTitleFromMessage(firstUserMessage.content)
        : 'New Chat';

      chat = await this.prisma.chat.create({
        data: {
          id,
          userId: currentUser.id,
          title,
        },
      });
    } else if (chat.userId !== currentUser.id) {
      throw new Error('Unauthorized access to chat');
    }

    // Save user messages
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      await this.saveMessages(
        id,
        userMessages.map((m) => ({
          id: m.id,
          chatId: id,
          role: m.role,
          parts: m.parts,
          attachments: m.experimental_attachments || [],
          createdAt: new Date(),
        })),
      );
    }

    // Get available roles, groups, users for context using Prisma directly
    const [roles, groups, users] = await Promise.all([
      this.prisma.role.findMany({
        select: { id: true, name: true },

      }),
      this.prisma.group.findMany({
        select: { id: true, name: true },

      }),
      this.prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true },

      }),
    ]);

    // Create system prompt with context
    const systemPromptText = systemPrompt({
      selectedChatModel: selectedChatModel || 'chat-model',
      roles: roles.map((r) => ({ _id: r.id, name: r.name })),
      groups: groups.map((g) => ({ _id: g.id, name: g.name })),
      users: users.map((u) => ({
        _id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
      })),
    });

    // Create tools with injected services
    const tools = {
      // Data retrieval tools
      get_forms: createGetFormsTool(this.prisma),
      get_form_responses: createGetFormResponsesTool(this.prisma),
      get_form_schema_by_id: createGetFormSchemaByIdTool(this.prisma),
      get_processes: createGetProcessesTool(this.prisma),
      get_processes_with_formid: createGetProcessesWithFormIdTool(this.prisma),
      get_process_by_id: createGetProcessByIdTool(this.prisma),
      get_user_by_id: createGetUserByIdTool(this.prisma),

      // Visualization tool
      create_chart_visualization: createChartVisualization,

      // Process AI tools
      generate_form: createGenerateFormTool(),
      save_form: createSaveFormTool(this.prisma, id),
      preview_form: createPreviewFormTool(),
      delete_form: createDeleteFormTool(this.prisma, id),
      save_process: createSaveProcessTool(this.prisma, id),
      save_roles: createSaveRolesTool(this.prisma, id),
      save_step: createSaveStepTool(this.prisma, id),
      delete_step: createDeleteStepTool(this.prisma, id),
      create_process: createProcessTool(this.prisma, id, currentUser.id),
    };

    // Create observable for streaming response
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const result = await streamText({
            model: myProvider('chat-model'),
            system: systemPromptText,
            messages,
            tools,
            onFinish: async ({ response }) => {
              try {
                // Save assistant messages - simplified for now
                await this.saveMessages(id, [
                  {
                    id: generateId(),
                    chatId: id,
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'Assistant response' }],
                    attachments: [],
                    createdAt: new Date(),
                  },
                ]);
              } catch (error) {
                this.logger.error('Failed to save assistant message:', error);
              }
            },
          });

          // Stream the response
          for await (const delta of result.textStream) {
            subscriber.next(
              new MessageEvent('data', {
                data: JSON.stringify({ type: 'text-delta', content: delta }),
              }),
            );
          }

          // Send finish event
          subscriber.next(
            new MessageEvent('data', {
              data: JSON.stringify({
                type: 'finish',
                finishReason: result.finishReason,
              }),
            }),
          );

          subscriber.complete();
        } catch (error) {
          this.logger.error('Error in AI streaming:', error);
          subscriber.error(error);
        }
      })();
    });
  }

  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId },
      });

      if (!chat || chat.userId !== userId) {
        return false;
      }

      await this.prisma.chat.delete({
        where: { id: chatId },
      });

      return true;
    } catch (error) {
      this.logger.error('Error deleting chat:', error);
      return false;
    }
  }

  // Helper methods for AI tools will be added here

  private async generateTitleFromMessage(message: string): Promise<string> {
    // Simple title generation - in a real implementation, this could use AI
    const words = message.split(' ').slice(0, 5);
    return words.join(' ') + (words.length >= 5 ? '...' : '');
  }

  private async saveMessages(chatId: string, messages: DBMessageInput[]) {
    await this.prisma.message.createMany({
      data: messages,
    });
  }
}
