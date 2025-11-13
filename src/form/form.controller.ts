import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from '../file/file.service';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFormDto } from './dto/create-form.dto';
import { DuplicateFormDto } from './dto/duplicate-form.dto';
import { MoveFormDto } from './dto/move-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { DeleteFormProcessDataDto } from './dto/delete-form-process-data.dto';
import { FormService } from './form.service';

@ApiTags('Forms')
@Controller('forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormController {
  constructor(
    private readonly formService: FormService,
    private readonly fileService: FileService,
  ) {}

  @Post('duplicate')
  duplicate(@Body() duplicateFormDto: DuplicateFormDto, @GetUser() user: AuthenticatedUser) {
    return this.formService.duplicate(
      duplicateFormDto.formId,
      user.id,
    );
  }

  @Post()
  create(@Body() createFormDto: CreateFormDto) {
    return this.formService.create(createFormDto);
  }

   @Get('generation-progress/:jobId')
  @ApiOperation({ summary: 'Get form generation progress by job ID' })
  @ApiResponse({
    status: 200,
    description: 'Progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            jobId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
            },
            progress: { type: 'number' },
            message: { type: 'string' },
            userId: { type: 'string' },
            formId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Progress record not found' })
  async getGenerationProgress(
    @Param('jobId') jobId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const progress = await this.formService.getGenerationProgress(
      jobId,
      user.id,
    );
    return progress;
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
                    label: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Failed to fetch forms with countries',
  })
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

  @Delete('process-data')
  @ApiOperation({
    summary: 'Delete all form-process data for specific form and process',
    description: 'Deletes all responses, applicant processes, completed forms, and processed applications for the specified form within the specified process. Also deletes the process and all its applicant processes.'
  })
  @ApiResponse({ status: 200, description: 'Form-process data deleted successfully' })
  @ApiResponse({ status: 404, description: 'Form or process not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteFormProcessData(
    @Body() deleteFormProcessDataDto: DeleteFormProcessDataDto,
    @GetUser() user: AuthenticatedUser
  ) {
    return this.formService.deleteFormProcessData(deleteFormProcessDataDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.formService.remove(id);
  }

  @Delete('full/:id')
  @ApiOperation({ summary: 'Delete form with all associated data (hard delete)' })
  @ApiResponse({ status: 200, description: 'Form and all associated data deleted successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async fullDelete(@Param('id') id: string, @GetUser() user: AuthenticatedUser) {
    return this.formService.fullDelete(id, user.id);
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

  @Post('generate-from-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generate form from uploaded file' })
  @ApiResponse({
    status: 201,
    description: 'Form generation started successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateFormFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folderId?: string; formId?: string },
    @GetUser() user: AuthenticatedUser,
  ) {
    const jobId = await this.fileService.processFileForFormGeneration(file, user.id, body.folderId, body.formId);
    return {
      jobId,
      message: 'Form generation started. Use the jobId to track progress.',
    };
  }


}
