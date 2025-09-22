import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FormFieldsService } from './form-fields.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import type { FormField, SystemField } from './form-fields.service';

@ApiTags('Form Fields')
@Controller('forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormFieldsController {
  constructor(private readonly formFieldsService: FormFieldsService) {}

  @Get(':id/fields')
  @ApiOperation({ summary: 'Get all fields for a specific form' })
  @ApiResponse({
    status: 200,
    description: 'Form fields retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            formId: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                  formId: { type: 'string' },
                  sectionId: { type: 'string' },
                  sectionName: { type: 'string' },
                  isSystemField: { type: 'boolean' },
                  options: { type: 'array', items: { type: 'string' } },
                  required: { type: 'boolean' }
                }
              }
            },
            systemFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                  isSystemField: { type: 'boolean' },
                  required: { type: 'boolean' }
                }
              }
            },
            formFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                  formId: { type: 'string' },
                  sectionId: { type: 'string' },
                  sectionName: { type: 'string' },
                  isSystemField: { type: 'boolean' },
                  options: { type: 'array', items: { type: 'string' } },
                  required: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getFormFields(
    @Param('id') formId: string,
    @GetUser() user: AuthenticatedUser
  ) {
    console.log(formId, user)
    return this.formFieldsService.getFormFields(formId, user.id);
  }

  @Get('fields/multiple')
  @ApiOperation({ summary: 'Get fields for multiple forms' })
  @ApiResponse({
    status: 200,
    description: 'Multiple form fields retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            formFieldsMap: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                    type: { type: 'string' },
                    formId: { type: 'string' },
                    sectionId: { type: 'string' },
                    sectionName: { type: 'string' },
                    isSystemField: { type: 'boolean' },
                    options: { type: 'array', items: { type: 'string' } },
                    required: { type: 'boolean' }
                  }
                }
              }
            },
            allFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                  formId: { type: 'string' },
                  sectionId: { type: 'string' },
                  sectionName: { type: 'string' },
                  isSystemField: { type: 'boolean' },
                  options: { type: 'array', items: { type: 'string' } },
                  required: { type: 'boolean' }
                }
              }
            },
            systemFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string' },
                  isSystemField: { type: 'boolean' },
                  required: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Form IDs are required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMultipleFormFields(
    @Query('formIds') formIds: string | string[],
    @GetUser() user: AuthenticatedUser
  ) {
    const formIdArray = Array.isArray(formIds) ? formIds : [formIds];
    return this.formFieldsService.getMultipleFormFields(formIdArray, user.id);
  }
}
