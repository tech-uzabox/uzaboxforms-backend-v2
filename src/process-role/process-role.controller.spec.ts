import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRole, RoleStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProcessRoleController } from './process-role.controller';
import { ProcessRoleService } from './process-role.service';

const mockProcessRole: ProcessRole = {
  processId: 'process-id-1',
  roleId: 'role-id-1',
  status: RoleStatus.ENABLED,
};

const mockProcessRoleService = {
  create: jest.fn().mockResolvedValue(mockProcessRole),
  createMany: jest.fn().mockResolvedValue({ count: 2 }),
  findAll: jest.fn().mockResolvedValue([mockProcessRole]),
  findOne: jest.fn().mockResolvedValue(mockProcessRole),
  update: jest.fn().mockResolvedValue(mockProcessRole),
  remove: jest.fn().mockResolvedValue(mockProcessRole),
  findByProcessId: jest.fn().mockResolvedValue([mockProcessRole]),
};

describe('ProcessRoleController', () => {
  let controller: ProcessRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessRoleController],
      providers: [
        { provide: ProcessRoleService, useValue: mockProcessRoleService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ProcessRoleController>(ProcessRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a process role', async () => {
      const createProcessRoleDto = {
        processId: 'process-id-1',
        roleId: 'role-id-1',
      };
      expect(await controller.create(createProcessRoleDto)).toEqual(
        mockProcessRole,
      );
      expect(mockProcessRoleService.create).toHaveBeenCalledWith(
        createProcessRoleDto.processId,
        createProcessRoleDto.roleId,
      );
    });
  });

  describe('createMany', () => {
    it('should create many process roles', async () => {
      const createManyProcessRoleDto = [
        { processId: 'process-id-1', roleId: 'role-id-1' },
        { processId: 'process-id-1', roleId: 'role-id-2' },
      ];
      expect(await controller.createMany(createManyProcessRoleDto)).toEqual({
        count: 2,
      });
      expect(mockProcessRoleService.createMany).toHaveBeenCalledWith(
        createManyProcessRoleDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of process roles', async () => {
      expect(await controller.findAll()).toEqual([mockProcessRole]);
      expect(mockProcessRoleService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process role', async () => {
      expect(
        await controller.findOne(
          mockProcessRole.processId,
          mockProcessRole.roleId,
        ),
      ).toEqual(mockProcessRole);
      expect(mockProcessRoleService.findOne).toHaveBeenCalledWith(
        mockProcessRole.processId,
        mockProcessRole.roleId,
      );
    });
  });

  describe('update', () => {
    it('should update a process role', async () => {
      const updateProcessRoleDto = { status: RoleStatus.DISABLED };
      expect(
        await controller.update(
          mockProcessRole.processId,
          mockProcessRole.roleId,
          updateProcessRoleDto,
        ),
      ).toEqual(mockProcessRole);
      expect(mockProcessRoleService.update).toHaveBeenCalledWith(
        mockProcessRole.processId,
        mockProcessRole.roleId,
        updateProcessRoleDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a process role', async () => {
      expect(
        await controller.remove(
          mockProcessRole.processId,
          mockProcessRole.roleId,
        ),
      ).toEqual(mockProcessRole);
      expect(mockProcessRoleService.remove).toHaveBeenCalledWith(
        mockProcessRole.processId,
        mockProcessRole.roleId,
      );
    });
  });

  describe('getRolesByProcessId', () => {
    it('should return roles by process ID', async () => {
      expect(
        await controller.getRolesByProcessId(mockProcessRole.processId),
      ).toEqual([mockProcessRole]);
      expect(mockProcessRoleService.findByProcessId).toHaveBeenCalledWith(
        mockProcessRole.processId,
      );
    });
  });
});
