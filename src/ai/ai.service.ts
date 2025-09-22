import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  appendResponseMessages,
  generateText,
  Message,
  pipeDataStreamToResponse,
  smoothStream,
  streamText,
} from 'ai';
import type { Response } from 'express';
import { AuthenticatedUser } from 'src/auth/decorators/get-user.decorator';
import { generateUUID } from 'src/utils/generate-uuid';
import { PrismaService } from '../db/prisma.service';
import { ChatProcessDto } from './dto/chat-process.dto';
import { systemPrompt } from './prompts';
import { openrouter } from './providers';
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
import { getMostRecentUserMessage, getTrailingMessageId } from './utils/chat';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  async processChat(
    dto: ChatProcessDto,
    currentUser: AuthenticatedUser,
    response: Response,
  ) {
    const { id, messages, selectedChatModel } = dto;

    let chat = await this.prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const title = firstUserMessage
        ? await this.generateTitleFromUserMessage({
            message: firstUserMessage,
          })
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

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      throw new BadRequestException('No user message found');
    }

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

    const tools = {
      get_forms: createGetFormsTool(this.prisma),
      get_form_responses: createGetFormResponsesTool(this.prisma),
      get_form_schema_by_id: createGetFormSchemaByIdTool(this.prisma),
      get_processes: createGetProcessesTool(this.prisma),
      get_processes_with_formid: createGetProcessesWithFormIdTool(this.prisma),
      get_process_by_id: createGetProcessByIdTool(this.prisma),
      get_user_by_id: createGetUserByIdTool(this.prisma),

      create_chart_visualization: createChartVisualization,

      generate_form: createGenerateFormTool,
      save_form: createSaveFormTool(this.prisma, id),
      preview_form: createPreviewFormTool,
      delete_form: createDeleteFormTool(this.prisma, id),
      save_process: createSaveProcessTool(this.prisma, id),
      save_roles: createSaveRolesTool(this.prisma, id),
      save_step: createSaveStepTool(this.prisma, id),
      delete_step: createDeleteStepTool(this.prisma, id),
      create_process: createProcessTool(this.prisma, id, currentUser.id),
    };

    pipeDataStreamToResponse(response, {
      execute: async (dataStreamWriter) => {
        dataStreamWriter.writeData('initialized call');
        const result = streamText({
          model: openrouter('x-ai/grok-4-fast:free'),
          system: systemPromptText,
          messages,
          experimental_generateMessageId: generateUUID,
          maxSteps: 100,
          experimental_transform: smoothStream({ chunking: 'word' }),
          providerOptions: {
            openrouter: {
              reasoning: {
                max_tokens: 4000,
              },
            },
          },
          tools,
          onFinish: async ({ response }) => {
            console.log(response.messages)
            try {
              const assistantId = getTrailingMessageId({
                messages: response.messages.filter(
                  (message) => message.role === 'assistant',
                ),
              });

              if (!assistantId) {
                throw new Error('No assistant message found!');
              }

              const [, assistantMessage] = appendResponseMessages({
                messages: [userMessage],
                responseMessages: response.messages,
              });
              await this.saveMessages(id, [
                {
                  id: assistantId,
                  chatId: id,
                  role: assistantMessage.role,
                  parts: assistantMessage.parts as any[],
                  attachments: assistantMessage.experimental_attachments ?? [],
                  createdAt: new Date(),
                },
              ]);
            } catch (error) {
              this.logger.error('Failed to save assistant message:', error);
            }
          },
        });

        result.consumeStream()

        result.mergeIntoDataStream(dataStreamWriter);
      },
      onError: (error) => {
        console.log('error', error instanceof Error ? error.message : String(error));
        // Error messages are masked by default for security reasons.
        // If you want to expose the error message to the client, you can do so here:
        return error instanceof Error ? error.message : String(error);
      },
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

  async getChatById(chatId: string, userId: string) {
    try {
      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!chat || chat.userId !== userId) {
        return null;
      }

      return chat;
    } catch (error) {
      this.logger.error('Error fetching chat:', error);
      return null;
    }
  }

  async getChatMessagesById(chatId: string, userId: string) {
    try {
      // First check if chat exists and belongs to user
      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId },
        select: { userId: true },
      });

      if (!chat || chat.userId !== userId) {
        return null;
      }

      const messages = await this.prisma.message.findMany({
        where: { chatId },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return messages;
    } catch (error) {
      this.logger.error('Error fetching chat messages:', error);
      return null;
    }
  }

  private async generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: openrouter('x-ai/grok-4-fast:free'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

  private async saveMessages(chatId: string, messages: DBMessageInput[]) {
    const messageIds = messages.map((m) => m.id);
    const existingMessages = await this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
      },
      select: { id: true },
    });
    const existingIds = new Set(existingMessages.map((m) => m.id));
    const newMessages = messages.filter((m) => !existingIds.has(m.id));

    if (newMessages.length > 0) {
      await this.prisma.message.createMany({
        data: newMessages,
      });
    }
  }
}
