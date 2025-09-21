import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  NotFoundException,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatProcessDto } from './dto/chat-process.dto';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly authService: AuthService,
  ) {}

  @Post('chat-process')
  @Sse()
  async processChat(
    @Body() dto: ChatProcessDto,
    @Headers('authorization') authHeader: string,
  ): Promise<Observable<MessageEvent>> {
    try {
      // Validate token and get user
      const token = authHeader?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.authService.validateToken(token);
      const currentUser = { id: payload.user.id };

      return this.aiService.processChat(dto, currentUser);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Delete('chat/:id')
  async deleteChat(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      // Validate token and get user
      const token = authHeader?.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.authService.validateToken(token);
      const currentUser = { id: payload.user.id };

      const result = await this.aiService.deleteChat(id, currentUser.id);
      if (!result) {
        throw new NotFoundException('Chat not found');
      }

      return { message: 'Chat deleted successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
