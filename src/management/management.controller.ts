import { Controller, Post, Delete, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
  uploadImage(
    @Body() body: { fileName: string; type: 'HEADER' | 'FOOTER' },
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.managementService.uploadImage(body.fileName, body.type, user.id);
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
