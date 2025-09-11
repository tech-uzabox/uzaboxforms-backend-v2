import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationUser, Prisma } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateOrganizationUserDto): Promise<OrganizationUser> {
    const { userId, title, superiorId } = data;
    if (!superiorId) {
      // Check if a root user already exists
      const existingRoot = await this.prisma.organizationUser.findFirst({
        where: { superiorId: null },
      });
      if (existingRoot) {
        await this.auditLogService.log({
          action: 'ORGANIZATION_USER_CREATE_FAILED',
          resource: 'OrganizationUser',
          status: 'FAILURE',
          errorMessage: 'A root user already exists.',
        });
        throw new BadRequestException(
          'A root user already exists. Only one root is allowed.',
        );
      }
    }
    const newOrgUser = await this.prisma.organizationUser.create({
      data: {
        user: { connect: { id: userId } },
        title,
        superior: superiorId ? { connect: { id: superiorId } } : undefined,
      },
    });
    await this.auditLogService.log({
      userId: newOrgUser.userId,
      action: 'ORGANIZATION_USER_CREATED',
      resource: 'OrganizationUser',
      resourceId: newOrgUser.id,
      status: 'SUCCESS',
      details: { title: newOrgUser.title, superiorId: newOrgUser.superiorId },
    });
    return newOrgUser;
  }

  async findAll(): Promise<OrganizationUser[]> {
    return this.prisma.organizationUser.findMany();
  }

  async findOne(id: string): Promise<OrganizationUser | null> {
    return this.prisma.organizationUser.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.OrganizationUserUpdateInput,
  ): Promise<OrganizationUser> {
    const updatedOrgUser = await this.prisma.organizationUser.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedOrgUser.userId,
      action: 'ORGANIZATION_USER_UPDATED',
      resource: 'OrganizationUser',
      resourceId: updatedOrgUser.id,
      status: 'SUCCESS',
      details: { title: updatedOrgUser.title, changes: data },
    });
    return updatedOrgUser;
  }

  async remove(id: string): Promise<OrganizationUser> {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { id },
    });

    if (!orgUser) {
      await this.auditLogService.log({
        action: 'ORGANIZATION_USER_DELETE_FAILED',
        resource: 'OrganizationUser',
        resourceId: id,
        status: 'FAILURE',
        errorMessage: 'Organization user not found.',
      });
      throw new NotFoundException('Organization user not found.');
    }

    const deletedOrgUser = await this.prisma.organizationUser.delete({
      where: { id },
    });
    await this.auditLogService.log({
      userId: deletedOrgUser.userId,
      action: 'ORGANIZATION_USER_DELETED',
      resource: 'OrganizationUser',
      resourceId: deletedOrgUser.id,
      status: 'SUCCESS',
      details: { title: deletedOrgUser.title },
    });
    return deletedOrgUser;
  }

  async getSubordinates(superiorId: string): Promise<OrganizationUser[]> {
    return this.prisma.organizationUser.findMany({ where: { superiorId } });
  }

  async getOrganizationTree(userId: string): Promise<any> {
    const userOrg = await this.prisma.organizationUser.findUnique({
      where: { userId },
      include: { subordinates: true },
    });

    if (!userOrg) {
      await this.auditLogService.log({
        userId: userId,
        action: 'GET_ORGANIZATION_TREE_FAILED',
        resource: 'OrganizationUser',
        status: 'FAILURE',
        errorMessage: 'User not found in organization.',
      });
      throw new NotFoundException('User not found in organization.');
    }

    const buildTree = async (node: OrganizationUser): Promise<any> => {
      const subordinates = await this.prisma.organizationUser.findMany({
        where: { superiorId: node.id },
        include: { user: true },
      });
      const children = await Promise.all(subordinates.map(buildTree));
      return { ...node, subordinates: children };
    };

    const tree = await buildTree(userOrg);
    await this.auditLogService.log({
      userId: userId,
      action: 'GET_ORGANIZATION_TREE',
      resource: 'OrganizationUser',
      status: 'SUCCESS',
    });
    return tree;
  }

  async getFullOrganizationHierarchy(): Promise<any[]> {
    const rootNodes = await this.prisma.organizationUser.findMany({
      where: { superiorId: null },
      include: { user: true },
    });

    const buildHierarchy = async (node: OrganizationUser): Promise<any> => {
      const subordinates = await this.prisma.organizationUser.findMany({
        where: { superiorId: node.id },
        include: { user: true },
      });
      const children = await Promise.all(subordinates.map(buildHierarchy));
      return { ...node, subordinates: children };
    };

    const hierarchy = await Promise.all(rootNodes.map(buildHierarchy));
    await this.auditLogService.log({
      action: 'GET_FULL_ORGANIZATION_HIERARCHY',
      resource: 'OrganizationUser',
      status: 'SUCCESS',
    });
    return hierarchy;
  }
}
