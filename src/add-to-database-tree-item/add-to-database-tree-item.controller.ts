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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddToDatabaseTreeItemService } from './add-to-database-tree-item.service';
import type { CreateAddToDatabaseTreeItemDto } from './dto/create-add-to-database-tree-item.dto';
import type { UpdateAddToDatabaseTreeItemDto } from './dto/update-add-to-database-tree-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Add to Database Tree Items')
@Controller('add-to-database-tree-item')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AddToDatabaseTreeItemController {
  constructor(private readonly addToDatabaseTreeItemService: AddToDatabaseTreeItemService) {}

  @Post()
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Create a new tree item' })
  @ApiResponse({
    status: 201,
    description: 'Tree item created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  create(@Body() createAddToDatabaseTreeItemDto: CreateAddToDatabaseTreeItemDto) {
    return this.addToDatabaseTreeItemService.create(createAddToDatabaseTreeItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tree items' })
  @ApiResponse({
    status: 200,
    description: 'Tree items retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.addToDatabaseTreeItemService.findAll();
  }

  @Get('add-to-database/:addToDatabaseId')
  @ApiOperation({ summary: 'Get tree items for a specific add-to-database group' })
  @ApiResponse({
    status: 200,
    description: 'Tree items retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByAddToDatabaseId(@Param('addToDatabaseId') addToDatabaseId: string) {
    return this.addToDatabaseTreeItemService.findByAddToDatabaseId(addToDatabaseId);
  }

  @Get('add-to-database/:addToDatabaseId/tree')
  @ApiOperation({ summary: 'Get full hierarchy tree for a specific add-to-database group' })
  @ApiResponse({
    status: 200,
    description: 'Full hierarchy tree retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFullHierarchy(@Param('addToDatabaseId') addToDatabaseId: string) {
    return this.addToDatabaseTreeItemService.getFullHierarchy(addToDatabaseId);
  }

  @Get('add-to-database/:addToDatabaseId/roots')
  @ApiOperation({ summary: 'Get root nodes for a specific add-to-database group' })
  @ApiResponse({
    status: 200,
    description: 'Root nodes retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRootNodes(@Param('addToDatabaseId') addToDatabaseId: string) {
    return this.addToDatabaseTreeItemService.findRootNodes(addToDatabaseId);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get children of a specific tree item' })
  @ApiResponse({
    status: 200,
    description: 'Children retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tree item not found' })
  getChildren(@Param('id') id: string) {
    return this.addToDatabaseTreeItemService.getChildren(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific tree item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tree item retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tree item not found' })
  findOne(@Param('id') id: string) {
    return this.addToDatabaseTreeItemService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Update a specific tree item' })
  @ApiResponse({
    status: 200,
    description: 'Tree item updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  @ApiResponse({ status: 404, description: 'Tree item not found' })
  update(@Param('id') id: string, @Body() updateAddToDatabaseTreeItemDto: UpdateAddToDatabaseTreeItemDto) {
    return this.addToDatabaseTreeItemService.update(id, updateAddToDatabaseTreeItemDto);
  }

  @Delete(':id')
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Delete a specific tree item' })
  @ApiResponse({
    status: 200,
    description: 'Tree item deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  @ApiResponse({ status: 404, description: 'Tree item not found' })
  remove(@Param('id') id: string) {
    return this.addToDatabaseTreeItemService.remove(id);
  }
}
