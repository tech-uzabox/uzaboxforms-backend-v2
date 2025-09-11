import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessComment } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProcessCommentController } from './process-comment.controller';
import { ProcessCommentService } from './process-comment.service';

const mockProcessComment: ProcessComment = {
  id: 'comment-id-1',
  applicantProcessId: 'applicant-process-id-1',
  userId: 'user-id-1',
  comment: 'Test comment',
  createdAt: new Date(),
};

const mockProcessCommentService = {
  create: jest.fn().mockResolvedValue(mockProcessComment),
  findAll: jest.fn().mockResolvedValue([mockProcessComment]),
  findOne: jest.fn().mockResolvedValue(mockProcessComment),
  update: jest.fn().mockResolvedValue(mockProcessComment),
  remove: jest.fn().mockResolvedValue(mockProcessComment),
  submitComment: jest.fn().mockResolvedValue(mockProcessComment),
  findByApplicantProcessIdAndFormId: jest
    .fn()
    .mockResolvedValue([mockProcessComment]),
};

describe('ProcessCommentController', () => {
  let controller: ProcessCommentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessCommentController],
      providers: [
        { provide: ProcessCommentService, useValue: mockProcessCommentService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<ProcessCommentController>(ProcessCommentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a process comment', async () => {
      expect(await controller.create(mockProcessComment)).toEqual(
        mockProcessComment,
      );
      expect(mockProcessCommentService.create).toHaveBeenCalledWith(
        mockProcessComment,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of process comments', async () => {
      expect(await controller.findAll()).toEqual([mockProcessComment]);
      expect(mockProcessCommentService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process comment', async () => {
      expect(await controller.findOne(mockProcessComment.id)).toEqual(
        mockProcessComment,
      );
      expect(mockProcessCommentService.findOne).toHaveBeenCalledWith(
        mockProcessComment.id,
      );
    });
  });

  describe('update', () => {
    it('should update a process comment', async () => {
      const updateDto = { comment: 'Updated comment' };
      expect(await controller.update(mockProcessComment.id, updateDto)).toEqual(
        mockProcessComment,
      );
      expect(mockProcessCommentService.update).toHaveBeenCalledWith(
        mockProcessComment.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a process comment', async () => {
      expect(await controller.remove(mockProcessComment.id)).toEqual(
        mockProcessComment,
      );
      expect(mockProcessCommentService.remove).toHaveBeenCalledWith(
        mockProcessComment.id,
      );
    });
  });

  describe('submitComment', () => {
    it('should submit a comment', async () => {
      const submitDto = {
        applicantProcessId: 'app-proc-id-1',
        userId: 'user-id-1',
        comment: 'New comment',
      };
      expect(await controller.submitComment(submitDto)).toEqual(
        mockProcessComment,
      );
      expect(mockProcessCommentService.submitComment).toHaveBeenCalledWith(
        submitDto.applicantProcessId,
        submitDto.userId,
        submitDto.comment,
      );
    });
  });

  describe('getCommentsByApplicantProcessIdAndFormId', () => {
    it('should return comments by applicant process ID and form ID', async () => {
      expect(
        await controller.getCommentsByApplicantProcessIdAndFormId(
          mockProcessComment.applicantProcessId,
          'form-id-1',
        ),
      ).toEqual([mockProcessComment]);
      expect(
        mockProcessCommentService.findByApplicantProcessIdAndFormId,
      ).toHaveBeenCalledWith(
        mockProcessComment.applicantProcessId,
        'form-id-1',
      );
    });
  });
});
