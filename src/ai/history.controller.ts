import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  GetUser,
  type AuthenticatedUser,
} from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto';
import { HistoryService } from './history.service';
@ApiTags('AI History')
@ApiBearerAuth()
@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'List of user chats with pagination info',
    schema: {
      type: 'object',
      properties: {
        chats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              visibility: { type: 'string' },
            },
          },
        },
        hasMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChatHistory(
    @Query() query: ChatHistoryQueryDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    try {
      // Validate pagination parameters
      if (query.starting_after && query.ending_before) {
        throw new BadRequestException(
          'Only one of starting_after or ending_before can be provided!',
        );
      }

      // Get chats
      const result = await this.historyService.getChatsByUserId({
        userId: user.id,
        limit: query.limit,
        startingAfter: query.starting_after,
        endingBefore: query.ending_before,
      });

      return result;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Failed to fetch chat history:', error);
      throw new BadRequestException('Failed to fetch chats!');
    }
  }
}
