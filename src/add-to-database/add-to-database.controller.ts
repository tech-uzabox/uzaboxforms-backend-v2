import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddToDatabaseService } from './add-to-database.service';
import type { CreateAddToDatabaseDto } from './dto/create-add-to-database.dto';
import type { UpdateAddToDatabaseDto } from './dto/update-add-to-database.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Add to Database')
@Controller('add-to-database')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AddToDatabaseController {
  constructor(private readonly addToDatabaseService: AddToDatabaseService) {}

  @Post()
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Create a new AddToDatabase entry' })
  @ApiResponse({
    status: 201,
    description: 'AddToDatabase created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  create(@Body() createAddToDatabaseDto: CreateAddToDatabaseDto) {
    return this.addToDatabaseService.create(createAddToDatabaseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all AddToDatabase entries' })
  @ApiResponse({
    status: 200,
    description: 'AddToDatabase entries retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.addToDatabaseService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full hierarchy tree' })
  @ApiResponse({
    status: 200,
    description: 'Full hierarchy tree of AddToDatabase entries',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFullHierarchy() {
    return this.addToDatabaseService.getFullHierarchy();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Get root nodes only' })
  @ApiResponse({
    status: 200,
    description: 'List of root AddToDatabase entries',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getRootNodes() {
    return this.addToDatabaseService.findRootNodes();
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get children of a specific node' })
  @ApiResponse({
    status: 200,
    description: 'List of children for the specified node',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  getChildren(@Param('id') id: string) {
    return this.addToDatabaseService.getChildren(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific AddToDatabase entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'AddToDatabase entry retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AddToDatabase not found' })
  findOne(@Param('id') id: string) {
    return this.addToDatabaseService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Update a specific AddToDatabase entry' })
  @ApiResponse({
    status: 200,
    description: 'AddToDatabase updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  @ApiResponse({ status: 404, description: 'AddToDatabase not found' })
  update(@Param('id') id: string, @Body() updateAddToDatabaseDto: UpdateAddToDatabaseDto) {
    return this.addToDatabaseService.update(id, updateAddToDatabaseDto);
  }

  @Delete(':id')
  @Roles('Admin', 'Staff')
  @ApiOperation({ summary: 'Delete a specific AddToDatabase entry' })
  @ApiResponse({
    status: 200,
    description: 'AddToDatabase deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Staff required' })
  @ApiResponse({ status: 404, description: 'AddToDatabase not found' })
  remove(@Param('id') id: string) {
    return this.addToDatabaseService.remove(id);
  }
}
