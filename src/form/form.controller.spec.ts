import { APP_PIPE } from '@nestjs/core';
import { FormService } from './form.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { Form, FormStatus, FormType } from 'db';
import { FormController } from './form.controller';
import { Test, TestingModule } from '@nestjs/testing';

const mockForm: Form = {
  id: 'form-id-1',
  name: 'Test Form',
  type: FormType.INTERNAL,
  status: FormStatus.ENABLED,
  archived: false,
  creatorId: 'user-id-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  design: {},
};

const mockFormService = {
  create: jest.fn().mockResolvedValue(mockForm),
  findAll: jest.fn().mockResolvedValue([mockForm]),
  findOne: jest.fn().mockResolvedValue(mockForm),
  update: jest.fn().mockResolvedValue(mockForm),
  remove: jest.fn().mockResolvedValue(mockForm),
  duplicate: jest.fn().mockResolvedValue(mockForm),
};

describe('FormController', () => {
  let controller: FormController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormController],
      providers: [
        { provide: FormService, useValue: mockFormService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<FormController>(FormController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a form', async () => {
      const createFormDto = { name: 'New Form', creatorId: 'user-id-1' , status: mockForm.status, type: mockForm.type};
      expect(await controller.create(createFormDto)).toEqual(mockForm);
      expect(mockFormService.create).toHaveBeenCalledWith(createFormDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of forms', async () => {
      expect(await controller.findAll()).toEqual([mockForm]);
      expect(mockFormService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single form', async () => {
      expect(await controller.findOne(mockForm.id)).toEqual(mockForm);
      expect(mockFormService.findOne).toHaveBeenCalledWith(mockForm.id);
    });
  });

  describe('update', () => {
    it('should update a form', async () => {
      const updateFormDto = { name: 'Updated Form' };
      expect(await controller.update(mockForm.id, updateFormDto)).toEqual(
        mockForm,
      );
      expect(mockFormService.update).toHaveBeenCalledWith(
        mockForm.id,
        updateFormDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a form', async () => {
      expect(await controller.remove(mockForm.id)).toEqual(mockForm);
      expect(mockFormService.remove).toHaveBeenCalledWith(mockForm.id);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a form', async () => {
      const duplicateFormDto = { formId: mockForm.id, creatorId: 'user-id-1' };
      expect(await controller.duplicate(duplicateFormDto)).toEqual(mockForm);
      expect(mockFormService.duplicate).toHaveBeenCalledWith(
        duplicateFormDto.formId,
        duplicateFormDto.creatorId,
      );
    });
  });
});
