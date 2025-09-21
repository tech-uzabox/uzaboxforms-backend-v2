import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from 'src/auth/decorators/get-user.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatProcessDto } from './dto/chat-process.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async processChat(
    @Body() dto: ChatProcessDto,
    @GetUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    return this.aiService.processChat(dto, user, response);
  }

  @Delete('chat/:id')
  async deleteChat(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.aiService.deleteChat(id, user.id);
    if (!result) {
      throw new NotFoundException('Chat not found');
    }

    return { message: 'Chat deleted successfully' };
  }

  @Get('chat/:id')
  @ApiResponse({
    status: 200,
    description: 'Chat retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        userId: { type: 'string' },
        visibility: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChat(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const chat = await this.aiService.getChatById(id, user.id);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }

  @Get('chat/:id/messages')
  @ApiResponse({
    status: 200,
    description: 'Chat messages retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string' },
          parts: { type: 'object' },
          attachments: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChatMessages(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const messages = await this.aiService.getChatMessagesById(id, user.id);
    if (!messages) {
      throw new NotFoundException('Chat not found');
    }

    return messages;
  }
}
