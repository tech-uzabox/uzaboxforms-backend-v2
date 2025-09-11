import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, RoleStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

const mockRole: Role = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Admin',
  description: 'Administrator Role',
  status: RoleStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRoleService = {
  create: jest.fn().mockResolvedValue(mockRole),
  findAll: jest.fn().mockResolvedValue([mockRole]),
  findOne: jest.fn().mockResolvedValue(mockRole),
  update: jest.fn().mockResolvedValue(mockRole),
  remove: jest.fn().mockResolvedValue(mockRole),
};

describe('RoleController', () => {
  let controller: RoleController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        { provide: RoleService, useValue: mockRoleService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role', async () => {
      const createRoleDto = { name: 'Admin', description: 'Administrator' };
      expect(await controller.create(createRoleDto)).toEqual(mockRole);
      expect(mockRoleService.create).toHaveBeenCalledWith(createRoleDto);
    });

    it('should throw error if creation fails', async () => {
      const createRoleDto = { name: 'Admin', description: 'Administrator' };
      mockRoleService.create.mockRejectedValue(new Error('Creation failed'));
      await expect(controller.create(createRoleDto)).rejects.toThrow('Creation failed');
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      expect(await controller.findAll()).toEqual([mockRole]);
      expect(mockRoleService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single role', async () => {
      expect(await controller.findOne(mockRole.id)).toEqual(mockRole);
      expect(mockRoleService.findOne).toHaveBeenCalledWith(mockRole.id);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const updateRoleDto = { name: 'Super Admin' };
      expect(await controller.update(mockRole.id, updateRoleDto)).toEqual(
        mockRole,
      );
      expect(mockRoleService.update).toHaveBeenCalledWith(
        mockRole.id,
        updateRoleDto,
      );
    });

    it('should throw error if update fails', async () => {
      const updateRoleDto = { name: 'Super Admin' };
      mockRoleService.update.mockRejectedValue(new Error('Update failed'));
      await expect(controller.update(mockRole.id, updateRoleDto)).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      expect(await controller.remove(mockRole.id)).toEqual(mockRole);
      expect(mockRoleService.remove).toHaveBeenCalledWith(mockRole.id);
    });

    it('should throw error if removal fails', async () => {
      mockRoleService.remove.mockRejectedValue(new Error('Removal failed'));
      await expect(controller.remove(mockRole.id)).rejects.toThrow('Removal failed');
    });
  });
});
