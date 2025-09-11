import { Injectable } from '@nestjs/common';
import { FormResponse, Prisma } from 'db';
import { PrismaService } from '../db/prisma.service';
import { CreateFormResponseDto } from './dto/create-form-response.dto';

@Injectable()
export class FormResponseService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFormResponseDto): Promise<FormResponse> {
    const { formId, applicantProcessId, responses } = data;
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
    });
    if (!applicantProcess) {
      throw new Error('Applicant process not found');
    }
    return this.prisma.formResponse.create({
      data: {
        form: { connect: { id: formId } },
        process: { connect: { id: applicantProcess.processId } },
        applicantProcess: { connect: { id: applicantProcessId } },
        responses,
      },
    });
  }

  async findAll(): Promise<FormResponse[]> {
    return this.prisma.formResponse.findMany();
  }

  async findOne(id: string): Promise<FormResponse | null> {
    return this.prisma.formResponse.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: Prisma.FormResponseUpdateInput,
  ): Promise<FormResponse> {
    return this.prisma.formResponse.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<FormResponse> {
    return this.prisma.formResponse.delete({ where: { id } });
  }

  async submitResponse(
    formId: string,
    applicantProcessId: string,
    responses: any,
  ): Promise<FormResponse> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
    });
    if (!applicantProcess) {
      throw new Error('Applicant process not found');
    }
    return this.prisma.formResponse.upsert({
      where: {
        formId_applicantProcessId: {
          formId,
          applicantProcessId,
        },
      },
      update: { responses },
      create: {
        form: { connect: { id: formId } },
        process: { connect: { id: applicantProcess.processId } },
        applicantProcess: { connect: { id: applicantProcessId } },
        responses,
      },
    });
  }

  async submitPublicResponse(
    formId: string,
    responses: any,
  ): Promise<FormResponse> {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { processForms: true },
    });
    if (!form || !form.processForms.length) {
      throw new Error('Form not found or not associated with a process');
    }
    // For public responses, we might not have an applicantProcessId initially.
    // A new applicantProcessId might be generated or assigned later.
    // For now, we'll create a new record.
    return this.prisma.formResponse.create({
      data: {
        form: { connect: { id: formId } },
        process: { connect: { id: form.processForms[0].processId } },
        applicantProcess: {
          create: {
            applicant: { create: { email: 'public@user.com', password: '' } },
            process: { connect: { id: form.processForms[0].processId } },
          },
        },
        responses,
      },
    });
  }

  async findByUserId(userId: string): Promise<FormResponse[]> {
    return this.prisma.formResponse.findMany({
      where: {
        applicantProcess: { applicantId: userId },
      },
    });
  }

  async findByUserIdAndFormId(
    userId: string,
    formId: string,
  ): Promise<FormResponse | null> {
    return this.prisma.formResponse.findFirst({
      where: {
        formId,
        applicantProcess: { applicantId: userId },
      },
    });
  }
}
