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

  async create(data: any): Promise<User> {
    const { roles, ...userData } = data;
    const hashedPassword = await this.hashPassword(data.password);

    // Validate roles exist if provided
    if (roles && roles.length > 0) {
      const existingRoles = await this.prisma.role.findMany({
        where: { id: { in: roles } },
        select: { id: true },
      });
      const existingRoleIds = existingRoles.map((r) => r.id);
      const invalidRoleIds = roles.filter(
        (id) => !existingRoleIds.includes(id),
      );
      if (invalidRoleIds.length > 0) {
        throw new Error(
          `Role(s) with ID(s) ${invalidRoleIds.join(', ')} not found`,
        );
      }
    }

    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        roles:
          roles && roles.length > 0
            ? {
                create: roles.map((roleId) => ({
                  roleId,
                  status: 'ENABLED',
                })),
              }
            : undefined,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.auditLogService.log({
      userId: newUser.id,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: newUser.id,
      status: 'SUCCESS',
      details: { email: newUser.email, roles },
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

  async update(id: string, data: any): Promise<User> {
    const oldUser = await this.prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      throw new NotFoundException('User not found.');
    }

    const { roles, ...userData } = data;

    // Use transaction to handle role synchronization atomically
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // If roles is provided, handle role synchronization
      if (roles !== undefined) {
        // Validate roles exist if provided
        if (roles.length > 0) {
          const existingRoles = await tx.role.findMany({
            where: { id: { in: roles } },
            select: { id: true },
          });
          const existingRoleIds = existingRoles.map((r) => r.id);
          const invalidRoleIds = roles.filter(
            (id) => !existingRoleIds.includes(id),
          );
          if (invalidRoleIds.length > 0) {
            throw new Error(
              `Role(s) with ID(s) ${invalidRoleIds.join(', ')} not found`,
            );
          }
        }

        // Get current user roles
        const currentUserRoles = await tx.userRole.findMany({
          where: { userId: id },
          select: { roleId: true },
        });
        const currentRoleIds = currentUserRoles.map((ur) => ur.roleId);

        // Determine roles to add and remove
        const rolesToAdd = roles.filter(
          (roleId) => !currentRoleIds.includes(roleId),
        );
        const rolesToRemove = currentRoleIds.filter(
          (roleId) => !roles.includes(roleId),
        );

        // Delete removed user roles
        if (rolesToRemove.length > 0) {
          await tx.userRole.deleteMany({
            where: {
              userId: id,
              roleId: { in: rolesToRemove },
            },
          });
        }

        // Create new user roles
        if (rolesToAdd.length > 0) {
          await tx.userRole.createMany({
            data: rolesToAdd.map((roleId) => ({
              userId: id,
              roleId,
              status: 'ENABLED',
            })),
          });
        }
      }

      // Handle password hashing if provided
      if (userData.password && typeof userData.password === 'string') {
        userData.password = await this.hashPassword(userData.password);
      }

      // Update the user itself
      return tx.user.update({
        where: { id },
        data: userData,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
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
