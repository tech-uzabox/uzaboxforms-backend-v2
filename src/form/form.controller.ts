import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { DuplicateFormDto } from './dto/duplicate-form.dto';
import { MoveFormDto } from './dto/move-form.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Forms')
@Controller('forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  create(@Body() createFormDto: CreateFormDto) {
    return this.formService.create(createFormDto);
  }
   @Get('with-countries')
  @ApiOperation({ summary: 'Get forms with countries fields' })
  @ApiResponse({
    status: 200,
    description: 'Forms with countries retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              formName: { type: 'string' },
              countryFields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Failed to fetch forms with countries' })
  getFormsWithCountries() {
    return this.formService.getFormsWithCountries();
  }

  @Get()
  findAll(@Query('folderId') folderId?: string) {
    return this.formService.findAll(folderId);
  }

  @Get(':id/fields')
  getFormFields(@Param('id') id: string) {
    return this.formService.getFormFields(id);
  }

  @Get('fields/multiple')
  getMultipleFormFields(@Query('formIds') formIds: string[]) {
    return this.formService.getMultipleFormFields(formIds);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFormDto: UpdateFormDto) {
    return this.formService.update(id, updateFormDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formService.remove(id);
  }

  @Post('duplicate')
  duplicate(@Body() duplicateFormDto: DuplicateFormDto) {
    return this.formService.duplicate(duplicateFormDto.formId, duplicateFormDto.creatorId);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move form to another folder' })
  @ApiResponse({ status: 200, description: 'Form moved successfully' })
  @ApiResponse({ status: 404, description: 'Form or target folder not found' })
  moveForm(@Body() moveFormDto: MoveFormDto) {
    return this.formService.moveForm(moveFormDto);
  }

  @Get('public')
  getPublicForms() {
    return this.formService.getPublicForms();
  }

}
