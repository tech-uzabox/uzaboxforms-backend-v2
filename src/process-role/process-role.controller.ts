import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProcessRoleService } from './process-role.service';
import { CreateProcessRoleDto } from './dto/create-process-role.dto';
import { CreateManyProcessRoleDto } from './dto/create-many-process-role.dto';
import { UpdateProcessRoleDto } from './dto/update-process-role.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Process Roles')
@Controller('process-roles')
export class ProcessRoleController {
  constructor(private readonly processRoleService: ProcessRoleService) {}

  @Post()
  create(@Body() createProcessRoleDto: CreateProcessRoleDto) {
    return this.processRoleService.create(createProcessRoleDto.processId, createProcessRoleDto.roleId);
  }

  @Post('many')
  createMany(@Body() createManyProcessRoleDto: CreateManyProcessRoleDto) {
    return this.processRoleService.createMany(createManyProcessRoleDto);
  }

  @Get()
  findAll() {
    return this.processRoleService.findAll();
  }

  @Get(':processId/:roleId')
  findOne(@Param('processId') processId: string, @Param('roleId') roleId: string) {
    return this.processRoleService.findOne(processId, roleId);
  }

  @Patch(':processId/:roleId')
  update(
    @Param('processId') processId: string,
    @Param('roleId') roleId: string,
    @Body() updateProcessRoleDto: UpdateProcessRoleDto,
  ) {
    return this.processRoleService.update(processId, roleId, updateProcessRoleDto);
  }

  @Delete(':processId/:roleId')
  remove(@Param('processId') processId: string, @Param('roleId') roleId: string) {
    return this.processRoleService.remove(processId, roleId);
  }

  @Get('by-process/:processId')
  getRolesByProcessId(@Param('processId') processId: string) {
    return this.processRoleService.findByProcessId(processId);
  }
}