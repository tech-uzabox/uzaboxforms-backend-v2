import { Injectable } from '@nestjs/common';
import { Group, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateGroupDto): Promise<Group> {
    const { name, creatorId } = data;
    const newGroup = await this.prisma.group.create({
      data: {
        name,
        creator: { connect: { id: creatorId } },
      },
    });
    await this.auditLogService.log({
      action: 'GROUP_CREATED',
      resource: 'Group',
      resourceId: newGroup.id,
      status: 'SUCCESS',
      details: { name: newGroup.name, creatorId: newGroup.creatorId },
    });
    return newGroup;
  }

  async findAll(): Promise<Group[]> {
    return this.prisma.group.findMany();
  }

  async findOne(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.GroupUpdateInput): Promise<Group> {
    const updatedGroup = await this.prisma.group.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      action: 'GROUP_UPDATED',
      resource: 'Group',
      resourceId: updatedGroup.id,
      status: 'SUCCESS',
      details: { name: updatedGroup.name, changes: data },
    });
    return updatedGroup;
  }

  async remove(id: string): Promise<Group> {
    const deletedGroup = await this.prisma.group.delete({ where: { id } });
    await this.auditLogService.log({
      action: 'GROUP_DELETED',
      resource: 'Group',
      resourceId: deletedGroup.id,
      status: 'SUCCESS',
      details: { name: deletedGroup.name },
    });
    return deletedGroup;
  }
}
