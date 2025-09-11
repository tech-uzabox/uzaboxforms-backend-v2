import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupRole, RoleStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { GroupRoleController } from './group-role.controller';
import { GroupRoleService } from './group-role.service';

const mockGroupRole: GroupRole = {
  groupId: 'group-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

const mockGroupRoleService = {
  create: jest.fn().mockResolvedValue(mockGroupRole),
  findAll: jest.fn().mockResolvedValue([mockGroupRole]),
  findOne: jest.fn().mockResolvedValue(mockGroupRole),
  update: jest.fn().mockResolvedValue(mockGroupRole),
  remove: jest.fn().mockResolvedValue(mockGroupRole),
};

describe('GroupRoleController', () => {
  let controller: GroupRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupRoleController],
      providers: [
        { provide: GroupRoleService, useValue: mockGroupRoleService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<GroupRoleController>(GroupRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a group role', async () => {
      const createGroupRoleDto = { groupId: 'group-id-1', roleId: 'role-id-1' };
      expect(await controller.create(createGroupRoleDto)).toEqual(
        mockGroupRole,
      );
      expect(mockGroupRoleService.create).toHaveBeenCalledWith(
        createGroupRoleDto.groupId,
        createGroupRoleDto.roleId,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of group roles', async () => {
      expect(await controller.findAll()).toEqual([mockGroupRole]);
      expect(mockGroupRoleService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single group role', async () => {
      expect(
        await controller.findOne(mockGroupRole.groupId, mockGroupRole.roleId),
      ).toEqual(mockGroupRole);
      expect(mockGroupRoleService.findOne).toHaveBeenCalledWith(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
      );
    });
  });

  describe('update', () => {
    it('should update a group role', async () => {
      const updateGroupRoleDto = { status: RoleStatus.DISABLED };
      expect(
        await controller.update(
          mockGroupRole.groupId,
          mockGroupRole.roleId,
          updateGroupRoleDto,
        ),
      ).toEqual(mockGroupRole);
      expect(mockGroupRoleService.update).toHaveBeenCalledWith(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
        updateGroupRoleDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a group role', async () => {
      expect(
        await controller.remove(mockGroupRole.groupId, mockGroupRole.roleId),
      ).toEqual(mockGroupRole);
      expect(mockGroupRoleService.remove).toHaveBeenCalledWith(
        mockGroupRole.groupId,
        mockGroupRole.roleId,
      );
    });
  });
});
