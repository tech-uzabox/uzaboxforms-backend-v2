import { Test, TestingModule } from '@nestjs/testing';
import { AddToDatabaseController } from './add-to-database.controller';
import { AddToDatabaseService } from './add-to-database.service';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

const mockAddToDatabaseService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('AddToDatabaseController', () => {
  let controller: AddToDatabaseController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddToDatabaseController],
      providers: [
        { provide: AddToDatabaseService, useValue: mockAddToDatabaseService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<AddToDatabaseController>(AddToDatabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
