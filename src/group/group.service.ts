import { Injectable } from '@nestjs/common';
import { Group } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateGroupDto): Promise<Group> {
    const { name, creatorId, roles } = data;

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

    const newGroup = await this.prisma.group.create({
      data: {
        name,
        creator: { connect: { id: creatorId } },
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
        creator: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.auditLogService.log({
      action: 'GROUP_CREATED',
      resource: 'Group',
      resourceId: newGroup.id,
      status: 'SUCCESS',
      details: { name: newGroup.name, creatorId: newGroup.creatorId, roles },
    });
    return newGroup;
  }

  async findAll(): Promise<Group[]> {
    return this.prisma.group.findMany({
      include: {
        creator: true,
        roles: true,
      },
    });
  }

  async findOne(id: string): Promise<Group | null> {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        creator: true,
        roles: true,
      },
    });
  }

  async update(id: string, data: UpdateGroupDto): Promise<Group> {
    const { roles, ...groupData } = data as any;

    // Use transaction to handle role synchronization atomically
    const updatedGroup = await this.prisma.$transaction(async (tx) => {
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

        // Get current group roles
        const currentGroupRoles = await tx.groupRole.findMany({
          where: { groupId: id },
          select: { roleId: true },
        });
        const currentRoleIds = currentGroupRoles.map((gr) => gr.roleId);

        // Determine roles to add and remove
        const rolesToAdd = roles.filter(
          (roleId) => !currentRoleIds.includes(roleId),
        );
        const rolesToRemove = currentRoleIds.filter(
          (roleId) => !roles.includes(roleId),
        );

        // Delete removed group roles
        if (rolesToRemove.length > 0) {
          await tx.groupRole.deleteMany({
            where: {
              groupId: id,
              roleId: { in: rolesToRemove },
            },
          });
        }

        // Create new group roles
        if (rolesToAdd.length > 0) {
          await tx.groupRole.createMany({
            data: rolesToAdd.map((roleId) => ({
              groupId: id,
              roleId,
              status: 'ENABLED',
            })),
          });
        }
      }

      // Update the group itself
      return tx.group.update({
        where: { id },
        data: groupData,
        include: {
          creator: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
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

  async getGroupAndProcessesByUserId(userId: string): Promise<any[]> {
    // Get enabled roles for the user
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        status: 'ENABLED',
      },
      select: { roleId: true },
    });

    if (!userRoles || userRoles.length === 0) {
      throw new Error('No enabled roles found for the user');
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get enabled group roles for those roles
    const groupRoles = await this.prisma.groupRole.findMany({
      where: {
        roleId: { in: roleIds },
        status: 'ENABLED',
      },
      select: { groupId: true },
    });

    if (!groupRoles || groupRoles.length === 0) {
      throw new Error('No accessible groups found for the user roles');
    }

    const groupIds = groupRoles.map((gr) => gr.groupId);

    // Get enabled groups
    const groups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds },
        status: 'ENABLED',
      },
      select: {
        id: true,
        name: true,
        status: true,
        creator: true,
        roles: true,
      },
    });

    if (!groups || groups.length === 0) {
      throw new Error('No enabled groups found for the user roles');
    }

    // For each group, get processes and first form id
    const groupsWithProcesses = await Promise.all(
      groups.map(async (group) => {
        const processes = await this.prisma.process.findMany({
          where: {
            groupId: group.id,
            status: 'ENABLED',
            archived: false,
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        });

        const processesWithFirstFormId = await Promise.all(
          processes.map(async (process) => {
            const firstForm = await this.prisma.processForm.findFirst({
              where: { processId: process.id },
              orderBy: { createdAt: 'asc' },
              select: { formId: true },
            });

            const firstFormId = firstForm?.formId || null;

            return {
              id: process.id,
              name: process.name,
              status: process.status,
              firstFormId,
            };
          }),
        );

        return {
          group: {
            id: group.id,
            name: group.name,
            status: group.status,
            creator: group.creator,
            roles: group.roles,
          },
          processes: processesWithFirstFormId,
        };
      }),
    );

    return groupsWithProcesses;
  }
}
