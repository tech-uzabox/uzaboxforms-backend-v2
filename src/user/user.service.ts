import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    const newUser = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
    await this.auditLogService.log({
      userId: newUser.id,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: newUser.id,
      status: 'SUCCESS',
      details: { email: newUser.email },
    });
    return newUser;
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const oldUser = await this.prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      throw new NotFoundException('User not found.');
    }

    if (data.password && typeof data.password === 'string') {
      data.password = await this.hashPassword(data.password);
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedUser.id,
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: updatedUser.id,
      status: 'SUCCESS',
      details: { oldData: oldUser, newData: updatedUser },
    });
    return updatedUser;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password.');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    await this.auditLogService.log({
      userId: updatedUser.id,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: updatedUser.id,
      status: 'SUCCESS',
    });
    return updatedUser;
  }

  async remove(id: string): Promise<User> {
    const deletedUser = await this.prisma.user.delete({ where: { id } });
    await this.auditLogService.log({
      userId: deletedUser.id,
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: deletedUser.id,
      status: 'SUCCESS',
      details: { email: deletedUser.email },
    });
    return deletedUser;
  }
}
