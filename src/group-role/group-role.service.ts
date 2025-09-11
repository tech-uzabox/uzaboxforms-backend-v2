import { Injectable } from '@nestjs/common';
import { GroupRole, Prisma } from 'db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class GroupRoleService {
  constructor(private prisma: PrismaService) {}

  async create(groupId: string, roleId: string): Promise<GroupRole> {
    return this.prisma.groupRole.create({
      data: { groupId, roleId },
    });
  }

  async findAll(): Promise<GroupRole[]> {
    return this.prisma.groupRole.findMany();
  }

  async findOne(groupId: string, roleId: string): Promise<GroupRole | null> {
    return this.prisma.groupRole.findUnique({
      where: { groupId_roleId: { groupId, roleId } },
    });
  }

  async findByGroupId(groupId: string): Promise<GroupRole[]> {
    return this.prisma.groupRole.findMany({ where: { groupId } });
  }

  async update(
    groupId: string,
    roleId: string,
    data: Prisma.GroupRoleUpdateInput,
  ): Promise<GroupRole> {
    return this.prisma.groupRole.update({
      where: { groupId_roleId: { groupId, roleId } },
      data,
    });
  }

  async remove(groupId: string, roleId: string): Promise<GroupRole> {
    return this.prisma.groupRole.delete({
      where: { groupId_roleId: { groupId, roleId } },
    });
  }
}
