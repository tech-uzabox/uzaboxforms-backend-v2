import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { FormResponse } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { FormResponseController } from './form-response.controller';
import { FormResponseService } from './form-response.service';

const mockFormResponse: FormResponse = {
  id: 'response-id-1',
  formId: 'form-id-1',
  applicantProcessId: 'applicant-process-id-1',
  responses: { question1: 'answer1' },
  createdAt: new Date(),
};

const mockFormResponseService = {
  create: jest.fn().mockResolvedValue(mockFormResponse),
  findAll: jest.fn().mockResolvedValue([mockFormResponse]),
  findOne: jest.fn().mockResolvedValue(mockFormResponse),
  update: jest.fn().mockResolvedValue(mockFormResponse),
  remove: jest.fn().mockResolvedValue(mockFormResponse),
  submitResponse: jest.fn().mockResolvedValue(mockFormResponse),
  submitPublicResponse: jest.fn().mockResolvedValue(mockFormResponse),
  findByUserId: jest.fn().mockResolvedValue([mockFormResponse]),
  findByUserIdAndFormId: jest.fn().mockResolvedValue(mockFormResponse),
};

describe('FormResponseController', () => {
  let controller: FormResponseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormResponseController],
      providers: [
        { provide: FormResponseService, useValue: mockFormResponseService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<FormResponseController>(FormResponseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a form response', async () => {
      expect(await controller.create(mockFormResponse)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.create).toHaveBeenCalledWith(
        mockFormResponse,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of form responses', async () => {
      expect(await controller.findAll()).toEqual([mockFormResponse]);
      expect(mockFormResponseService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single form response', async () => {
      expect(await controller.findOne(mockFormResponse.id)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.findOne).toHaveBeenCalledWith(
        mockFormResponse.id,
      );
    });
  });

  describe('update', () => {
    it('should update a form response', async () => {
      const updateDto = { responses: { question1: 'updated' } };
      expect(await controller.update(mockFormResponse.id, updateDto)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.update).toHaveBeenCalledWith(
        mockFormResponse.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a form response', async () => {
      expect(await controller.remove(mockFormResponse.id)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.remove).toHaveBeenCalledWith(
        mockFormResponse.id,
      );
    });
  });

  describe('submitResponse', () => {
    it('should submit a form response', async () => {
      const submitDto = {
        formId: 'form-id-1',
        applicantProcessId: 'app-proc-id-1',
        responses: { q1: 'a1' },
      };
      expect(await controller.submitResponse(submitDto)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.submitResponse).toHaveBeenCalledWith(
        submitDto.formId,
        submitDto.applicantProcessId,
        submitDto.responses,
      );
    });
  });

  describe('submitPublicResponse', () => {
    it('should submit a public form response', async () => {
      const submitDto = { formId: 'form-id-1', responses: { q1: 'a1' } };
      expect(await controller.submitPublicResponse(submitDto)).toEqual(
        mockFormResponse,
      );
      expect(mockFormResponseService.submitPublicResponse).toHaveBeenCalledWith(
        submitDto.formId,
        submitDto.responses,
      );
    });
  });

  describe('getResponsesByUserId', () => {
    it('should return responses by user ID', async () => {
      expect(await controller.getResponsesByUserId('user-id-1')).toEqual([
        mockFormResponse,
      ]);
      expect(mockFormResponseService.findByUserId).toHaveBeenCalledWith(
        'user-id-1',
      );
    });
  });

  describe('getResponseByUserIdAndFormId', () => {
    it('should return a response by user ID and form ID', async () => {
      expect(
        await controller.getResponseByUserIdAndFormId('user-id-1', 'form-id-1'),
      ).toEqual(mockFormResponse);
      expect(
        mockFormResponseService.findByUserIdAndFormId,
      ).toHaveBeenCalledWith('user-id-1', 'form-id-1');
    });
  });
});
