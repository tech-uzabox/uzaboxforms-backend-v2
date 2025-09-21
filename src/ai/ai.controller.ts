import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
