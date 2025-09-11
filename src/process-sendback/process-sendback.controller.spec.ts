import { Test, TestingModule } from '@nestjs/testing';
import { ProcessSendbackController } from './process-sendback.controller';
import { ProcessSendbackService } from './process-sendback.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { APP_PIPE } from '@nestjs/core';

const mockProcessSendbackService = {
  sendback: jest.fn(),
};

describe('ProcessSendbackController', () => {
  let controller: ProcessSendbackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessSendbackController],
      providers: [
        { provide: ProcessSendbackService, useValue: mockProcessSendbackService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ProcessSendbackController>(ProcessSendbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendback', () => {
    it('should send back the last completed step', async () => {
      const sendbackDto = { applicantProcessId: 'applicant-process-id-1' };
      mockProcessSendbackService.sendback.mockResolvedValue({ message: 'Last step sent back successfully.' });

      const result = await controller.sendback(sendbackDto);
      expect(result).toEqual({ message: 'Last step sent back successfully.' });
      expect(mockProcessSendbackService.sendback).toHaveBeenCalledWith(sendbackDto.applicantProcessId);
    });
  });
});