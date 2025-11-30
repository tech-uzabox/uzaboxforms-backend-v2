import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';

@ApiTags('Admin - Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('create')
  @ApiOperation({ summary: 'Create a system backup (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Backup created and downloaded successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not an Admin.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during backup creation.',
  })
  async createBackup(@Res() res: Response) {
    try {
      const filename = this.backupService.getBackupFilename();
      const backupStream = await this.backupService.createBackup();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      backupStream.pipe(res);
    } catch (error) {
      throw new HttpException(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


