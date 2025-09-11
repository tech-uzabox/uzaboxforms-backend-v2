import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupRoleService } from './group-role.service';
import { CreateGroupRoleDto } from './dto/create-group-role.dto';
import { UpdateGroupRoleDto } from './dto/update-group-role.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Group Roles')
@Controller('group-roles')
export class GroupRoleController {
  constructor(private readonly groupRoleService: GroupRoleService) {}

  @Post()
  create(@Body() createGroupRoleDto: CreateGroupRoleDto) {
    return this.groupRoleService.create(createGroupRoleDto.groupId, createGroupRoleDto.roleId);
  }

  @Get()
  findAll() {
    return this.groupRoleService.findAll();
  }

  @Get(':groupId/:roleId')
  findOne(@Param('groupId') groupId: string, @Param('roleId') roleId: string) {
    return this.groupRoleService.findOne(groupId, roleId);
  }

  @Patch(':groupId/:roleId')
  update(
    @Param('groupId') groupId: string,
    @Param('roleId') roleId: string,
    @Body() updateGroupRoleDto: UpdateGroupRoleDto,
  ) {
    return this.groupRoleService.update(groupId, roleId, updateGroupRoleDto);
  }

  @Delete(':groupId/:roleId')
  remove(@Param('groupId') groupId: string, @Param('roleId') roleId: string) {
    return this.groupRoleService.remove(groupId, roleId);
  }
}