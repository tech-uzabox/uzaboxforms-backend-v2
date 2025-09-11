import { Test, TestingModule } from '@nestjs/testing';
import { Group, GroupStatus } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { GroupService } from './group.service';

const mockPrismaService = {
  group: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockGroup: Group = {
  id: 'group-id-1',
  name: 'Test Group',
  status: GroupStatus.ENABLED,
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GroupService', () => {
  let service: GroupService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new group', async () => {
      const createGroupDto = { name: 'New Group', creatorId: 'user-id-1' };
      mockPrismaService.group.create.mockResolvedValue(mockGroup);

      const result = await service.create(createGroupDto);
      expect(result).toEqual(mockGroup);
      expect(prisma.group.create).toHaveBeenCalledWith({
        data: {
          name: createGroupDto.name,
          creator: { connect: { id: createGroupDto.creatorId } },
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      mockPrismaService.group.findMany.mockResolvedValue([mockGroup]);

      const result = await service.findAll();
      expect(result).toEqual([mockGroup]);
      expect(prisma.group.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single group by id', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.findOne(mockGroup.id);
      expect(result).toEqual(mockGroup);
      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: mockGroup.id },
      });
    });
  });

  describe('update', () => {
    it('should update a group', async () => {
      const updateGroupDto = { name: 'Updated Group' };
      const updatedGroup = { ...mockGroup, ...updateGroupDto };
      mockPrismaService.group.update.mockResolvedValue(updatedGroup);

      const result = await service.update(mockGroup.id, updateGroupDto);
      expect(result).toEqual(updatedGroup);
      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: mockGroup.id },
        data: updateGroupDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a group', async () => {
      mockPrismaService.group.delete.mockResolvedValue(mockGroup);

      await service.remove(mockGroup.id);
      expect(prisma.group.delete).toHaveBeenCalledWith({
        where: { id: mockGroup.id },
      });
    });
  });
});
