import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddToDatabaseService } from './add-to-database.service';

@ApiTags('Add to Database')
@Controller('add-to-database')
@UseGuards(JwtAuthGuard)
export class AddToDatabaseController {
  constructor(private readonly addToDatabaseService: AddToDatabaseService) {}

  @Post()
  create(@Body() createAddToDatabaseDto: { name: string; status: 'ENABLED' | 'DISABLED'; levels?: any[] }) {
    return this.addToDatabaseService.create(createAddToDatabaseDto);
  }

  @Get()
  findAll() {
    return this.addToDatabaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addToDatabaseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAddToDatabaseDto: any) {
    return this.addToDatabaseService.update(id, updateAddToDatabaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.addToDatabaseService.remove(id);
  }
}
