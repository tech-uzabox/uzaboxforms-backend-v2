import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProcessFolderService } from './process-folder.service';
import { CreateProcessFolderDto } from './dto/create-process-folder.dto';
import { UpdateProcessFolderDto } from './dto/update-process-folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Process Folders')
@Controller('process-folders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessFolderController {
  constructor(private readonly processFolderService: ProcessFolderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new process folder' })
  @ApiResponse({
    status: 201,
    description: 'Process folder created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createProcessFolderDto: CreateProcessFolderDto) {
    return this.processFolderService.create(createProcessFolderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all process folders' })
  @ApiResponse({
    status: 200,
    description: 'Returns all process folders',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.processFolderService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a process folder by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the process folder',
  })
  @ApiResponse({ status: 404, description: 'Process folder not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    const processFolder = await this.processFolderService.findOne(id);
    if (!processFolder) {
      throw new HttpException('Process folder not found', HttpStatus.NOT_FOUND);
    }
    return processFolder;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a process folder' })
  @ApiResponse({
    status: 200,
    description: 'Process folder updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Process folder not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() updateProcessFolderDto: UpdateProcessFolderDto,
  ) {
    return this.processFolderService.update(id, updateProcessFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a process folder' })
  @ApiResponse({
    status: 200,
    description: 'Process folder deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Process folder not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string) {
    return this.processFolderService.remove(id);
  }
}

