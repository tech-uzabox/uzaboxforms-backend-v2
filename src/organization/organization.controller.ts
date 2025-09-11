import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  create(@Body() createOrganizationUserDto: CreateOrganizationUserDto) {
    return this.organizationService.create(createOrganizationUserDto);
  }

  @Get()
  findAll() {
    return this.organizationService.findAll();
  }

  @Get('tree')
  getFullOrganizationHierarchy() {
    return this.organizationService.getFullOrganizationHierarchy();
  }

  @Get('tree/:userId')
  getOrganizationTree(@Param('userId') userId: string) {
    return this.organizationService.getOrganizationTree(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Get(':id/subordinates')
  getSubordinates(@Param('id') id: string) {
    return this.organizationService.getSubordinates(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrganizationUserDto: UpdateOrganizationUserDto) {
    return this.organizationService.update(id, updateOrganizationUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.organizationService.remove(id);
  }
}