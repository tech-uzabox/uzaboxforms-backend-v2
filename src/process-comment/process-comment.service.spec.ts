import { Test, TestingModule } from '@nestjs/testing';
import { ProcessComment } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ProcessCommentService } from './process-comment.service';

const mockPrismaService = {
  processComment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockProcessComment: ProcessComment = {
  id: 'comment-id-1',
  applicantProcessId: 'applicant-process-id-1',
  userId: 'user-id-1',
  comment: 'Test comment',
  createdAt: new Date(),
};

describe('ProcessCommentService', () => {
  let service: ProcessCommentService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessCommentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ProcessCommentService>(ProcessCommentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new process comment', async () => {
      mockPrismaService.processComment.create.mockResolvedValue(
        mockProcessComment,
      );

      const result = await service.create(mockProcessComment);
      expect(result).toEqual(mockProcessComment);
      expect(prisma.processComment.create).toHaveBeenCalledWith({
        data: {
          applicantProcess: { connect: { id: mockProcessComment.applicantProcessId } },
          userId: mockProcessComment.userId,
          comment: mockProcessComment.comment,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of process comments', async () => {
      mockPrismaService.processComment.findMany.mockResolvedValue([
        mockProcessComment,
      ]);

      const result = await service.findAll();
      expect(result).toEqual([mockProcessComment]);
      expect(prisma.processComment.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process comment by id', async () => {
      mockPrismaService.processComment.findUnique.mockResolvedValue(
        mockProcessComment,
      );

      const result = await service.findOne(mockProcessComment.id);
      expect(result).toEqual(mockProcessComment);
      expect(prisma.processComment.findUnique).toHaveBeenCalledWith({
        where: { id: mockProcessComment.id },
      });
    });
  });

  describe('update', () => {
    it('should update a process comment', async () => {
      const updatedComment = {
        ...mockProcessComment,
        comment: 'Updated comment',
      };
      mockPrismaService.processComment.update.mockResolvedValue(updatedComment);

      const result = await service.update(mockProcessComment.id, {
        comment: 'Updated comment',
      });
      expect(result).toEqual(updatedComment);
      expect(prisma.processComment.update).toHaveBeenCalledWith({
        where: { id: mockProcessComment.id },
        data: { comment: 'Updated comment' },
      });
    });
  });

  describe('remove', () => {
    it('should delete a process comment', async () => {
      mockPrismaService.processComment.delete.mockResolvedValue(
        mockProcessComment,
      );

      await service.remove(mockProcessComment.id);
      expect(prisma.processComment.delete).toHaveBeenCalledWith({
        where: { id: mockProcessComment.id },
      });
    });
  });

  describe('submitComment', () => {
    it('should submit a new comment', async () => {
      mockPrismaService.processComment.create.mockResolvedValue(
        mockProcessComment,
      );

      const result = await service.submitComment(
        mockProcessComment.applicantProcessId,
        mockProcessComment.userId,
        mockProcessComment.comment,
      );
      expect(result).toEqual(mockProcessComment);
      expect(prisma.processComment.create).toHaveBeenCalledWith({
        data: {
          applicantProcessId: mockProcessComment.applicantProcessId,
          userId: mockProcessComment.userId,
          comment: mockProcessComment.comment,
        },
      });
    });
  });

  describe('findByApplicantProcessIdAndFormId', () => {
    it('should return comments for a given applicant process ID and form ID', async () => {
      mockPrismaService.processComment.findMany.mockResolvedValue([
        mockProcessComment,
      ]);

      const result = await service.findByApplicantProcessIdAndFormId(
        mockProcessComment.applicantProcessId,
        'form-id-1',
      );
      expect(result).toEqual([mockProcessComment]);
      expect(prisma.processComment.findMany).toHaveBeenCalledWith({
        where: {
          applicantProcessId: mockProcessComment.applicantProcessId,
          // Assuming formId is part of the comment or can be filtered
          // This might need adjustment based on actual schema/logic
        },
      });
    });
  });
});
