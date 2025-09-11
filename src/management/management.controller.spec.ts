import { Test, TestingModule } from '@nestjs/testing';
import { ManagementController } from './management.controller';
import { ManagementService } from './management.service';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

const mockManagementService = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  getAllImages: jest.fn(),
};

describe('ManagementController', () => {
  let controller: ManagementController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManagementController],
      providers: [
        { provide: ManagementService, useValue: mockManagementService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ManagementController>(ManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
