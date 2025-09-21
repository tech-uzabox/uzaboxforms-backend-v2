import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { HistoryService } from './history.service';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto';

@ApiTags('AI History')
@ApiBearerAuth()
@Controller('history')
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
    @Headers('authorization') authHeader?: string,
  ) {
    try {
      // Validate token and get user
      const token = authHeader?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.authService.validateToken(token);
      const currentUser = { id: payload.user.id };

      // Validate pagination parameters
      if (query.starting_after && query.ending_before) {
        throw new BadRequestException('Only one of starting_after or ending_before can be provided!');
      }

      // Get chats
      const result = await this.historyService.getChatsByUserId({
        userId: currentUser.id,
        limit: query.limit,
        startingAfter: query.starting_after,
        endingBefore: query.ending_before,
      });

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      console.error('Failed to fetch chat history:', error);
      throw new BadRequestException('Failed to fetch chats!');
    }
  }
}
