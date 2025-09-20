import { Controller, Post, Delete, Get, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManagementService } from './management.service';

@ApiTags('Management')
@Controller('management')
@UseGuards(JwtAuthGuard)
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload management image',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        type: {
          type: 'string',
          enum: ['HEADER', 'FOOTER'],
          description: 'Type of management image',
        },
      },
      required: ['file', 'type'],
    },
  })
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: 'HEADER' | 'FOOTER' },
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.managementService.uploadImage(file, body.type, user.id);
  }

  @Delete('delete-image')
  deleteImage(
    @Body() body: { fileName: string; type: 'HEADER' | 'FOOTER' },
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.managementService.deleteImage(body.fileName, body.type, user.id);
  }

  @Get('get-all-images')
  getAllImages() {
    return this.managementService.getAllImages();
  }
}
