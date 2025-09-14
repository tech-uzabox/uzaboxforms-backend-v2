import { Injectable, NotFoundException } from '@nestjs/common';
import { AddToDatabase } from 'db';
import { PrismaService } from '../db/prisma.service';
import { CreateAddToDatabaseDto } from './dto/create-add-to-database.dto';
import { UpdateAddToDatabaseDto } from './dto/update-add-to-database.dto';

@Injectable()
export class AddToDatabaseService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAddToDatabaseDto): Promise<AddToDatabase> {
    const { name, status, levels } = data;
    return this.prisma.addToDatabase.create({
      data: {
        name,
        status,
        levels: levels || [],
      },
    });
  }

  async findAll(): Promise<AddToDatabase[]> {
    return this.prisma.addToDatabase.findMany();
  }

  async findOne(id: string): Promise<AddToDatabase | null> {
    return this.prisma.addToDatabase.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateAddToDatabaseDto): Promise<AddToDatabase> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`AddToDatabase with ID ${id} not found`);
    }

    return this.prisma.addToDatabase.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<AddToDatabase> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`AddToDatabase with ID ${id} not found`);
    }

    return this.prisma.addToDatabase.delete({ where: { id } });
  }
}
