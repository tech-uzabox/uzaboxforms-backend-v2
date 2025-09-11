import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('User Roles')
@Controller('user-roles')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  @Post()
  create(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRoleService.create(createUserRoleDto.userId, createUserRoleDto.roleId);
  }

  @Get()
  findAll() {
    return this.userRoleService.findAll();
  }

  @Get(':userId/:roleId')
  findOne(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRoleService.findOne(userId, roleId);
  }

  @Patch(':userId/:roleId')
  update(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.userRoleService.update(userId, roleId, updateUserRoleDto);
  }

  @Delete(':userId/:roleId')
  remove(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRoleService.remove(userId, roleId);
  }
}