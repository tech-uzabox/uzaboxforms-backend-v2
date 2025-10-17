import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteFormProcessDataDto {
  @ApiProperty({
    description: 'The ID of the process',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  processId: string;

  @ApiProperty({
    description: 'The ID of the form',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  formId: string;
}
