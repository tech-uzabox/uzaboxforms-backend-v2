import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUser, User } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { OrganizationService } from './organization.service';

const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashed',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: 'ENABLED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOrganizationUser: OrganizationUser & {
  user?: User;
  superior?: OrganizationUser;
  subordinates?: OrganizationUser[];
} = {
  id: 'org-user-id-1',
  userId: 'user-id-1',
  superiorId: null,
  title: 'CEO',
  user: mockUser,
  subordinates: [],
};

const mockPrismaService = {
  organizationUser: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new organization user', async () => {
      const createDto = { userId: 'user-id-1', title: 'CEO' };
      mockPrismaService.organizationUser.create.mockResolvedValue(
        mockOrganizationUser,
      );
      mockPrismaService.organizationUser.findFirst.mockResolvedValue(null); // No existing root

      const result = await service.create(createDto);
      expect(result).toEqual(mockOrganizationUser);
      expect(prisma.organizationUser.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: createDto.userId } },
          title: createDto.title,
          superior: createDto.superiorId ? { connect: { id: createDto.superiorId } } : undefined,
        },
      });
    });

    it('should throw BadRequestException if a root user already exists', async () => {
      const createDto = { userId: 'user-id-2', title: 'New CEO' };
      mockPrismaService.organizationUser.findFirst.mockResolvedValue(
        mockOrganizationUser,
      ); // Existing root

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of organization users', async () => {
      mockPrismaService.organizationUser.findMany.mockResolvedValue([
        mockOrganizationUser,
      ]);

      const result = await service.findAll();
      expect(result).toEqual([mockOrganizationUser]);
      expect(prisma.organizationUser.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single organization user by id', async () => {
      mockPrismaService.organizationUser.findUnique.mockResolvedValue(
        mockOrganizationUser,
      );

      const result = await service.findOne(mockOrganizationUser.id);
      expect(result).toEqual(mockOrganizationUser);
      expect(prisma.organizationUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrganizationUser.id },
      });
    });
  });

  describe('update', () => {
    it('should update an organization user', async () => {
      const updateDto = { title: 'New CEO' };
      const updatedOrgUser = { ...mockOrganizationUser, ...updateDto };
      mockPrismaService.organizationUser.update.mockResolvedValue(
        updatedOrgUser,
      );

      const result = await service.update(mockOrganizationUser.id, updateDto);
      expect(result).toEqual(updatedOrgUser);
      expect(prisma.organizationUser.update).toHaveBeenCalledWith({
        where: { id: mockOrganizationUser.id },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete an organization user', async () => {
      mockPrismaService.organizationUser.findUnique.mockResolvedValue(
        mockOrganizationUser,
      );
      mockPrismaService.organizationUser.delete.mockResolvedValue(
        mockOrganizationUser,
      );

      await service.remove(mockOrganizationUser.id);
      expect(prisma.organizationUser.delete).toHaveBeenCalledWith({
        where: { id: mockOrganizationUser.id },
      });
    });

    it('should throw NotFoundException if organization user not found', async () => {
      mockPrismaService.organizationUser.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
