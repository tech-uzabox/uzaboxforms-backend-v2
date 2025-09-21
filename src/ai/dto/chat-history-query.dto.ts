import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ChatHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Number of chats to return',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Cursor for forward pagination - returns chats created after this chat ID',
  })
  @IsOptional()
  @IsString()
  starting_after?: string;

  @ApiPropertyOptional({
    description: 'Cursor for backward pagination - returns chats created before this chat ID',
  })
  @IsOptional()
  @IsString()
  ending_before?: string;
}
