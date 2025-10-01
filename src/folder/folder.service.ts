import { Injectable, BadRequestException } from '@nestjs/common';
import { Folder } from 'db/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FolderService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async create(data: CreateFolderDto): Promise<Folder> {
    const { name, description, creatorId } = data;
    const newFolder = await this.prisma.folder.create({
      data: {
        name,
        description,
        creator: { connect: { id: creatorId } },
      },
      include: {
        creator: true,
        forms: true,
      },
    });
    await this.auditLogService.log({
      userId: newFolder.creatorId,
      action: 'FOLDER_CREATED',
      resource: 'Folder',
      resourceId: newFolder.id,
      status: 'SUCCESS',
      details: { name: newFolder.name, description: newFolder.description },
    });
    return newFolder;
  }

  async findAll(): Promise<Folder[]> {
    return this.prisma.folder.findMany({
      include: {
        creator: true,
        forms: true,
      },
    });
  }

  async findOne(id: string): Promise<Folder | null> {
    return this.prisma.folder.findUnique({
      where: { id },
      include: {
        creator: true,
        forms: true,
      },
    });
  }

  async update(id: string, data: UpdateFolderDto): Promise<Folder> {
    const updatedFolder = await this.prisma.folder.update({
      where: { id },
      data,
      include: {
        creator: true,
        forms: true,
      },
    });
    await this.auditLogService.log({
      userId: updatedFolder.creatorId,
      action: 'FOLDER_UPDATED',
      resource: 'Folder',
      resourceId: updatedFolder.id,
      status: 'SUCCESS',
      details: { name: updatedFolder.name, changes: data },
    });
    return updatedFolder;
  }

  async remove(id: string): Promise<Folder> {
    // Check if folder exists
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: { forms: true },
    });

    if (!folder) {
      throw new BadRequestException('Folder not found');
    }

    // Check if folder has any forms
    if (folder.forms && folder.forms.length > 0) {
      throw new BadRequestException(
        `Cannot delete folder "${folder.name}" because it contains ${folder.forms.length} form(s). Please move or delete all forms in this folder before deleting it.`
      );
    }

    const deletedFolder = await this.prisma.folder.delete({ where: { id } });
    await this.auditLogService.log({
      userId: deletedFolder.creatorId,
      action: 'FOLDER_DELETED',
      resource: 'Folder',
      resourceId: deletedFolder.id,
      status: 'SUCCESS',
      details: { name: deletedFolder.name },
    });
    return deletedFolder;
  }
}
