import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Group, GroupStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

const mockGroup: Group = {
  id: 'group-id-1',
  name: 'Test Group',
  status: GroupStatus.ENABLED,
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGroupService = {
  create: jest.fn().mockResolvedValue(mockGroup),
  findAll: jest.fn().mockResolvedValue([mockGroup]),
  findOne: jest.fn().mockResolvedValue(mockGroup),
  update: jest.fn().mockResolvedValue(mockGroup),
  remove: jest.fn().mockResolvedValue(mockGroup),
};

describe('GroupController', () => {
  let controller: GroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        { provide: GroupService, useValue: mockGroupService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<GroupController>(GroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a group', async () => {
      const createGroupDto = { name: 'New Group', creatorId: 'user-id-1' };
      expect(await controller.create(createGroupDto)).toEqual(mockGroup);
      expect(mockGroupService.create).toHaveBeenCalledWith(createGroupDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      expect(await controller.findAll()).toEqual([mockGroup]);
      expect(mockGroupService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single group', async () => {
      expect(await controller.findOne(mockGroup.id)).toEqual(mockGroup);
      expect(mockGroupService.findOne).toHaveBeenCalledWith(mockGroup.id);
    });
  });

  describe('update', () => {
    it('should update a group', async () => {
      const updateGroupDto = { name: 'Updated Group' };
      expect(await controller.update(mockGroup.id, updateGroupDto)).toEqual(
        mockGroup,
      );
      expect(mockGroupService.update).toHaveBeenCalledWith(
        mockGroup.id,
        updateGroupDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a group', async () => {
      expect(await controller.remove(mockGroup.id)).toEqual(mockGroup);
      expect(mockGroupService.remove).toHaveBeenCalledWith(mockGroup.id);
    });
  });
});
