import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/decorators/get-user.decorator';
import { CertificateFieldMappingService } from './certificate-field-mapping.service';
import { CreateFieldMappingDto } from './dto/create-field-mapping.dto';

@ApiTags('Certificate Field Mappings')
@Controller('certificate-field-mappings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificateFieldMappingController {
  constructor(
    private readonly certificateFieldMappingService: CertificateFieldMappingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a field mapping' })
  @ApiResponse({ status: 201, description: 'Field mapping created successfully.' })
  create(
    @Body() createFieldMappingDto: CreateFieldMappingDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.certificateFieldMappingService.create(
      createFieldMappingDto,
      user.id,
    );
  }

  @Get('template/:templateId')
  @ApiOperation({ summary: 'Get all field mappings for a template' })
  @ApiResponse({ status: 200, description: 'List of field mappings.' })
  findAll(@Param('templateId') templateId: string) {
    return this.certificateFieldMappingService.findAll(templateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a field mapping by ID' })
  @ApiResponse({ status: 200, description: 'Field mapping found.' })
  @ApiResponse({ status: 404, description: 'Field mapping not found.' })
  findOne(@Param('id') id: string) {
    return this.certificateFieldMappingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a field mapping' })
  @ApiResponse({ status: 200, description: 'Field mapping updated successfully.' })
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateFieldMappingDto>,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.certificateFieldMappingService.update(id, updateData, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a field mapping' })
  @ApiResponse({ status: 200, description: 'Field mapping deleted successfully.' })
  remove(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.certificateFieldMappingService.remove(id, user.id);
  }

  @Delete('template/:templateId/all')
  @ApiOperation({ summary: 'Delete all field mappings for a template' })
  @ApiResponse({ status: 200, description: 'All field mappings deleted successfully.' })
  removeByTemplate(
    @Param('templateId') templateId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.certificateFieldMappingService.removeByTemplate(templateId, user.id);
  }
}

