import { Injectable } from '@nestjs/common';
import { Prisma, ProcessComment } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateProcessCommentDto } from './dto/create-process-comment.dto';

@Injectable()
export class ProcessCommentService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateProcessCommentDto): Promise<ProcessComment> {
    const { applicantProcessId, userId, comment } = data;

    const newComment = await this.prisma.processComment.create({
      data: {
        applicantProcessId,
        userId,
        comment,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'PROCESS_COMMENT_CREATED',
      resource: 'ProcessComment',
      resourceId: newComment.id,
      status: 'SUCCESS',
      details: {
        applicantProcessId,
        comment,
      },
    });
    return newComment;
  }

  async findAll(): Promise<ProcessComment[]> {
    return this.prisma.processComment.findMany();
  }

  async findOne(id: string): Promise<ProcessComment | null> {
    return this.prisma.processComment.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.ProcessCommentUpdateInput,
  ): Promise<ProcessComment> {
    const updatedComment = await this.prisma.processComment.update({
      where: { id },
      data,
    });
    await this.auditLogService.log({
      userId: updatedComment.userId,
      action: 'PROCESS_COMMENT_UPDATED',
      resource: 'ProcessComment',
      resourceId: updatedComment.id,
      status: 'SUCCESS',
      details: {
        applicantProcessId: updatedComment.applicantProcessId,
        changes: data,
      },
    });
    return updatedComment;
  }

  async remove(id: string): Promise<ProcessComment> {
    const deletedComment = await this.prisma.processComment.delete({
      where: { id },
    });
    await this.auditLogService.log({
      userId: deletedComment.userId,
      action: 'PROCESS_COMMENT_DELETED',
      resource: 'ProcessComment',
      resourceId: deletedComment.id,
      status: 'SUCCESS',
      details: { applicantProcessId: deletedComment.applicantProcessId },
    });
    return deletedComment;
  }

  async submitComment(
    applicantProcessId: string,
    userId: string,
    comment: string,
  ): Promise<ProcessComment> {
    const newComment = await this.prisma.processComment.create({
      data: {
        applicantProcessId,
        userId,
        comment,
      },
    });
    await this.auditLogService.log({
      userId: newComment.userId,
      action: 'PROCESS_COMMENT_SUBMITTED',
      resource: 'ProcessComment',
      resourceId: newComment.id,
      status: 'SUCCESS',
      details: {
        applicantProcessId: newComment.applicantProcessId,
        comment: newComment.comment,
      },
    });
    return newComment;
  }

  async findByApplicantProcessIdAndFormId(
    applicantProcessId: string,
    formId: string,
  ): Promise<any[]> {
    const comments = await this.prisma.processComment.findMany({
      where: {
        applicantProcessId,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch user details for each comment
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await this.prisma.user.findUnique({
          where: { id: comment.userId },
          select: { firstName: true, lastName: true },
        });

        return {
          userId: comment.userId,
          comment: comment.comment,
          createdAt: comment.createdAt,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
          } : {
            firstName: 'Unknown',
            lastName: 'User',
          },
        };
      })
    );

    return commentsWithUsers;
  }
}
