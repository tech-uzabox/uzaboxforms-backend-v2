import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleStatus, UserRole } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { UserRoleController } from './user-role.controller';
import { UserRoleService } from './user-role.service';

const mockUserRole: UserRole = {
  userId: 'user-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

const mockUserRoleService = {
  create: jest.fn().mockResolvedValue(mockUserRole),
  findAll: jest.fn().mockResolvedValue([mockUserRole]),
  findOne: jest.fn().mockResolvedValue(mockUserRole),
  update: jest.fn().mockResolvedValue(mockUserRole),
  remove: jest.fn().mockResolvedValue(mockUserRole),
};

describe('UserRoleController', () => {
  let controller: UserRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRoleController],
      providers: [
        { provide: UserRoleService, useValue: mockUserRoleService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<UserRoleController>(UserRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user role', async () => {
      const createUserRoleDto = { userId: 'user-id-1', roleId: 'role-id-1' };
      expect(await controller.create(createUserRoleDto)).toEqual(mockUserRole);
      expect(mockUserRoleService.create).toHaveBeenCalledWith(
        createUserRoleDto.userId,
        createUserRoleDto.roleId,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of user roles', async () => {
      expect(await controller.findAll()).toEqual([mockUserRole]);
      expect(mockUserRoleService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user role', async () => {
      expect(
        await controller.findOne(mockUserRole.userId, mockUserRole.roleId),
      ).toEqual(mockUserRole);
      expect(mockUserRoleService.findOne).toHaveBeenCalledWith(
        mockUserRole.userId,
        mockUserRole.roleId,
      );
    });
  });

  describe('update', () => {
    it('should update a user role', async () => {
      const updateUserRoleDto = { status: RoleStatus.DISABLED };
      expect(
        await controller.update(
          mockUserRole.userId,
          mockUserRole.roleId,
          updateUserRoleDto,
        ),
      ).toEqual(mockUserRole);
      expect(mockUserRoleService.update).toHaveBeenCalledWith(
        mockUserRole.userId,
        mockUserRole.roleId,
        updateUserRoleDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user role', async () => {
      expect(
        await controller.remove(mockUserRole.userId, mockUserRole.roleId),
      ).toEqual(mockUserRole);
      expect(mockUserRoleService.remove).toHaveBeenCalledWith(
        mockUserRole.userId,
        mockUserRole.roleId,
      );
    });
  });
});
