import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Process, ProcessStatus, ProcessType } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';

const mockProcess: Process = {
  id: 'process-id-1',
  name: 'Test Process',
  type: ProcessType.PRIVATE,
  groupId: 'group-id-1',
  creatorId: 'user-id-1',
  status: ProcessStatus.ENABLED,
  archived: false,
  staffViewForms: false,
  applicantViewProcessLevel: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProcessService = {
  create: jest.fn().mockResolvedValue(mockProcess),
  findAll: jest.fn().mockResolvedValue([mockProcess]),
  findOne: jest.fn().mockResolvedValue(mockProcess),
  update: jest.fn().mockResolvedValue(mockProcess),
  remove: jest.fn().mockResolvedValue(mockProcess),
  submitProcessForm: jest.fn().mockResolvedValue(mockProcess),
  duplicate: jest.fn().mockResolvedValue(mockProcess),
};

describe('ProcessController', () => {
  let controller: ProcessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessController],
      providers: [
        { provide: ProcessService, useValue: mockProcessService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ProcessController>(ProcessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a process without roles', async () => {
      const createProcessDto = {
        name: 'New Process',
        groupId: 'group-id-1',
        creatorId: 'user-id-1',
        type: ProcessType.PRIVATE,
        status: ProcessStatus.ENABLED,
        archived: false,
        staffViewForms: false,
        applicantViewProcessLevel: false,
      };
      expect(await controller.create(createProcessDto)).toEqual(mockProcess);
      expect(mockProcessService.create).toHaveBeenCalledWith(createProcessDto);
    });

    it('should create a process with roles', async () => {
      const createProcessDto = {
        name: 'New Process',
        groupId: 'group-id-1',
        creatorId: 'user-id-1',
        type: ProcessType.PRIVATE,
        status: ProcessStatus.ENABLED,
        archived: false,
        staffViewForms: false,
        applicantViewProcessLevel: false,
        roles: ['role-id-1', 'role-id-2'],
      };
      expect(await controller.create(createProcessDto)).toEqual(mockProcess);
      expect(mockProcessService.create).toHaveBeenCalledWith(createProcessDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of processes', async () => {
      expect(await controller.findAll()).toEqual([mockProcess]);
      expect(mockProcessService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process', async () => {
      expect(await controller.findOne(mockProcess.id)).toEqual(mockProcess);
      expect(mockProcessService.findOne).toHaveBeenCalledWith(mockProcess.id);
    });
  });

  describe('update', () => {
    it('should update a process', async () => {
      const updateProcessDto = { name: 'Updated Process' };
      expect(await controller.update(mockProcess.id, updateProcessDto)).toEqual(
        mockProcess,
      );
      expect(mockProcessService.update).toHaveBeenCalledWith(
        mockProcess.id,
        updateProcessDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a process', async () => {
      expect(await controller.remove(mockProcess.id)).toEqual(mockProcess);
      expect(mockProcessService.remove).toHaveBeenCalledWith(mockProcess.id);
    });
  });

  describe('submitProcessForm', () => {
    it('should configure forms within a process', async () => {
      const submitProcessFormDto = {
        processId: mockProcess.id,
        staffViewForms: true,
        applicantViewProcessLevel: true,
        processForms: [
          {
            formId: 'form-id-1',
            order: 1,
            nextStepType: 'STATIC',
            nextStaffId: 'staff-id-1',
          },
        ],
      };
      const { processId, ...configData } = submitProcessFormDto; // Extract processId
      expect(
        await controller.submitProcessForm(processId, submitProcessFormDto),
      ).toEqual(mockProcess);
      expect(mockProcessService.submitProcessForm).toHaveBeenCalledWith(
        processId,
        submitProcessFormDto,
      );
    });
  });

  describe('duplicate', () => {
    it('should duplicate a process', async () => {
      const duplicateProcessDto = {
        processId: mockProcess.id,
        creatorId: 'user-id-1',
      };
      expect(await controller.duplicate(duplicateProcessDto)).toEqual(
        mockProcess,
      );
      expect(mockProcessService.duplicate).toHaveBeenCalledWith(
        duplicateProcessDto.processId,
        duplicateProcessDto.creatorId,
      );
    });
  });
});
