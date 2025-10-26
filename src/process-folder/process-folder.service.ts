import { Injectable, BadRequestException } from '@nestjs/common';
import { ProcessFolder } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateProcessFolderDto } from './dto/create-process-folder.dto';
import { UpdateProcessFolderDto } from './dto/update-process-folder.dto';

@Injectable()
export class ProcessFolderService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateProcessFolderDto): Promise<ProcessFolder> {
    const { name, description, creatorId } = data;
    const newProcessFolder = await this.prisma.processFolder.create({
      data: {
        name,
        description,
        creator: { connect: { id: creatorId } },
      },
      include: {
        creator: true,
        processes: true,
      },
    });
    await this.auditLogService.log({
      userId: newProcessFolder.creatorId,
      action: 'PROCESS_FOLDER_CREATED',
      resource: 'ProcessFolder',
      resourceId: newProcessFolder.id,
      status: 'SUCCESS',
      details: { name: newProcessFolder.name, description: newProcessFolder.description },
    });
    return newProcessFolder;
  }

  async findAll(): Promise<ProcessFolder[]> {
    return this.prisma.processFolder.findMany({
      include: {
        creator: true,
        processes: {
          include: {
            group: true,
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photo: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<ProcessFolder | null> {
    return this.prisma.processFolder.findUnique({
      where: { id },
      include: {
        creator: true,
        processes: {
          include: {
            group: true,
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photo: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateProcessFolderDto): Promise<ProcessFolder> {
    const { name, description } = data;
    const updatedProcessFolder = await this.prisma.processFolder.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        creator: true,
        processes: true,
      },
    });
    await this.auditLogService.log({
      userId: updatedProcessFolder.creatorId,
      action: 'PROCESS_FOLDER_UPDATED',
      resource: 'ProcessFolder',
      resourceId: updatedProcessFolder.id,
      status: 'SUCCESS',
      details: { name: updatedProcessFolder.name, description: updatedProcessFolder.description },
    });
    return updatedProcessFolder;
  }

  async remove(id: string): Promise<ProcessFolder> {
    // Check if folder has processes
    const processFolder = await this.prisma.processFolder.findUnique({
      where: { id },
      include: { processes: true },
    });

    if (!processFolder) {
      throw new BadRequestException('Process folder not found');
    }

    if (processFolder.processes && processFolder.processes.length > 0) {
      throw new BadRequestException(
        'Cannot delete process folder that contains processes. Please move or delete the processes first.',
      );
    }

    const deletedProcessFolder = await this.prisma.processFolder.delete({
      where: { id },
    });

    await this.auditLogService.log({
      userId: deletedProcessFolder.creatorId,
      action: 'PROCESS_FOLDER_DELETED',
      resource: 'ProcessFolder',
      resourceId: deletedProcessFolder.id,
      status: 'SUCCESS',
      details: { name: deletedProcessFolder.name },
    });

    return deletedProcessFolder;
  }
}

