import { Injectable, NotFoundException } from '@nestjs/common';
import { AddToDatabase, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AddToDatabaseService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: { name: string; status: 'ENABLED' | 'DISABLED'; levels?: any[] }): Promise<AddToDatabase> {
    const { name, status, levels = [] } = data;

    const newAddToDatabase = await this.prisma.addToDatabase.create({
      data: {
        name,
        status,
        levels: levels as Prisma.JsonArray,
      },
    });

    await this.auditLogService.log({
      action: 'ADD_TO_DATABASE_CREATED',
      resource: 'AddToDatabase',
      resourceId: newAddToDatabase.id,
      status: 'SUCCESS',
      details: { name: newAddToDatabase.name, status: newAddToDatabase.status },
    });

    return newAddToDatabase;
  }

  async update(id: string, data: Prisma.AddToDatabaseUpdateInput): Promise<AddToDatabase> {
    const updatedAddToDatabase = await this.prisma.addToDatabase.update({
      where: { id },
      data,
    });

    await this.auditLogService.log({
      action: 'ADD_TO_DATABASE_UPDATED',
      resource: 'AddToDatabase',
      resourceId: updatedAddToDatabase.id,
      status: 'SUCCESS',
      details: { name: updatedAddToDatabase.name, changes: data },
    });

    return updatedAddToDatabase;
  }

  async findAll(): Promise<AddToDatabase[]> {
    return this.prisma.addToDatabase.findMany();
  }

  async findOne(id: string): Promise<AddToDatabase | null> {
    const addToDatabase = await this.prisma.addToDatabase.findUnique({ where: { id } });

    if (!addToDatabase) {
      throw new NotFoundException(`AddToDatabase with ID ${id} not found`);
    }

    return addToDatabase;
  }

  async remove(id: string): Promise<AddToDatabase> {
    const deletedAddToDatabase = await this.prisma.addToDatabase.delete({ where: { id } });

    await this.auditLogService.log({
      action: 'ADD_TO_DATABASE_DELETED',
      resource: 'AddToDatabase',
      resourceId: deletedAddToDatabase.id,
      status: 'SUCCESS',
      details: { name: deletedAddToDatabase.name },
    });

    return deletedAddToDatabase;
  }
}
