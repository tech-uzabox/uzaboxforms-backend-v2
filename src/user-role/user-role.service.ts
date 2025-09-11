import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from 'db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UserRoleService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.create({
      data: { userId, roleId },
    });
  }

  async findAll(): Promise<UserRole[]> {
    return this.prisma.userRole.findMany();
  }

  async findOne(userId: string, roleId: string): Promise<UserRole | null> {
    return this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async findByUserId(userId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({ where: { userId } });
  }

  async update(
    userId: string,
    roleId: string,
    data: Prisma.UserRoleUpdateInput,
  ): Promise<UserRole> {
    return this.prisma.userRole.update({
      where: { userId_roleId: { userId, roleId } },
      data,
    });
  }

  async remove(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }
}
