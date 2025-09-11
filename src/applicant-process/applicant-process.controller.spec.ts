import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess, ProcessStatus } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { ApplicantProcessController } from './applicant-process.controller';
import { ApplicantProcessService } from './applicant-process.service';

const mockApplicantProcess: ApplicantProcess = {
  id: 'applicant-process-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: ProcessStatus.ENABLED,
  createdAt: new Date(),
};

const mockApplicantProcessService = {
  create: jest.fn().mockResolvedValue(mockApplicantProcess),
  findAll: jest.fn().mockResolvedValue([mockApplicantProcess]),
  findOne: jest.fn().mockResolvedValue(mockApplicantProcess),
  update: jest.fn().mockResolvedValue(mockApplicantProcess),
  remove: jest.fn().mockResolvedValue(mockApplicantProcess),
  findByUserId: jest.fn().mockResolvedValue([mockApplicantProcess]),
};

describe('ApplicantProcessController', () => {
  let controller: ApplicantProcessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicantProcessController],
      providers: [
        {
          provide: ApplicantProcessService,
          useValue: mockApplicantProcessService,
        },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ApplicantProcessController>(
      ApplicantProcessController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an applicant process', async () => {
      const createDto = { applicantId: 'user-id-1', processId: 'process-id-1', formId: 'form-1', responses: {} };
      expect(await controller.create(createDto)).toEqual(mockApplicantProcess);
      expect(mockApplicantProcessService.create).toHaveBeenCalledWith(
        createDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of applicant processes', async () => {
      expect(await controller.findAll()).toEqual([mockApplicantProcess]);
      expect(mockApplicantProcessService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single applicant process', async () => {
      expect(await controller.findOne(mockApplicantProcess.id)).toEqual(
        mockApplicantProcess,
      );
      expect(mockApplicantProcessService.findOne).toHaveBeenCalledWith(
        mockApplicantProcess.id,
      );
    });
  });

  describe('update', () => {
    it('should update an applicant process', async () => {
      const updateDto = { status: ProcessStatus.DISABLED };
      expect(
        await controller.update(mockApplicantProcess.id, updateDto),
      ).toEqual(mockApplicantProcess);
      expect(mockApplicantProcessService.update).toHaveBeenCalledWith(
        mockApplicantProcess.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove an applicant process', async () => {
      expect(await controller.remove(mockApplicantProcess.id)).toEqual(
        mockApplicantProcess,
      );
      expect(mockApplicantProcessService.remove).toHaveBeenCalledWith(
        mockApplicantProcess.id,
      );
    });
  });

  describe('getApplicationsByUserId', () => {
    it('should return applicant processes for a given user ID', async () => {
      expect(await controller.getApplicationsByUserId('user-id-1')).toEqual([
        mockApplicantProcess,
      ]);
      expect(mockApplicantProcessService.findByUserId).toHaveBeenCalledWith(
        'user-id-1',
      );
    });
  });
});
