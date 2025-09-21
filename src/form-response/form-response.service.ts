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

  async findAll(): Promise<{ success: boolean; responses: FormResponse[] }> {
    const responses = await this.prisma.formResponse.findMany();
    return { success: true, responses };
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
  ): Promise<{ success: boolean; message: string; response: FormResponse }> {
    const applicantProcess = await this.prisma.applicantProcess.findUnique({
      where: { id: applicantProcessId },
    });
    if (!applicantProcess) {
      throw new Error('Applicant process not found');
    }
    const existingResponse = await this.prisma.formResponse.upsert({
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

    return {
      success: true,
      message: 'Response submitted successfully',
      response: existingResponse,
    };
  }

  async submitPublicResponse(
    formId: string,
    responses: any,
  ): Promise<{ success: boolean; message: string; response: FormResponse }> {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { processForms: true },
    });
    if (!form || !form.processForms.length) {
      throw new Error('Form not found or not associated with a process');
    }

    const processId = form.processForms[0].processId;

    // For public responses, use a special public applicant process
    // First, try to find existing public applicant process for this process
    let publicApplicantProcess = await this.prisma.applicantProcess.findFirst({
      where: {
        processId,
        applicant: { email: 'public@system.local' },
      },
    });

    if (!publicApplicantProcess) {
      // Create public applicant if not exists
      const publicApplicant = await this.prisma.user.upsert({
        where: { email: 'public@system.local' },
        update: {},
        create: {
          email: 'public@system.local',
          password: '',
          firstName: 'Public',
          lastName: 'User',
        },
      });

      publicApplicantProcess = await this.prisma.applicantProcess.create({
        data: {
          applicantId: publicApplicant.id,
          processId,
        },
      });
    }

    // Upsert the response for this form and public applicant process
    const existingResponse = await this.prisma.formResponse.upsert({
      where: {
        formId_applicantProcessId: {
          formId,
          applicantProcessId: publicApplicantProcess.id,
        },
      },
      update: { responses },
      create: {
        form: { connect: { id: formId } },
        process: { connect: { id: processId } },
        applicantProcess: { connect: { id: publicApplicantProcess.id } },
        responses,
      },
    });

    return {
      success: true,
      message: 'Response submitted successfully',
      response: existingResponse,
    };
  }

  async findByUserId(
    userId: string,
  ): Promise<{ success: boolean; responses: FormResponse[] }> {
    const responses = await this.prisma.formResponse.findMany({
      where: {
        applicantProcess: { applicantId: userId },
      },
    });
    return { success: true, responses };
  }

  async findByUserIdAndFormId(
    userId: string,
    formId: string,
    applicantProcessId?: string,
  ): Promise<any> {
    // Step 1: Main user response
    const userResponse = await this.prisma.formResponse.findFirst({
      where: {
        formId,
        applicantProcessId,
      },
    });

    if (!userResponse) {
      throw new Error('Response not found');
    }

    // Step 2: Get form name
    const form = await this.prisma.form.findUnique({
      where: { id: userResponse.formId },
      select: { name: true },
    });
    const responseByUser = {
      formName: form?.name || 'Untitled Form',
      ...userResponse,
    };

    // Step 3: Get process details
    const process = await this.prisma.process.findUnique({
      where: { id: userResponse.processId },
    });
    if (!process) {
      throw new Error('Process not found');
    }

    // Step 4: Fetch all forms under this process
    const allProcessForms = await this.prisma.processForm.findMany({
      where: { processId: userResponse.processId },
    });

    const relatedProcessForms = allProcessForms.filter(
      (pf) => pf.processId === userResponse.processId,
    );

    // Step 5: Fetch completed forms by this applicant process
    const relatedCompletedForms = await this.prisma.aPCompletedForm.findMany({
      where: { applicantProcessId },
    });

    const totalForms = relatedProcessForms.length;
    const completedFormsCount = relatedCompletedForms.length;

    let responses = [responseByUser];

    const applicantProcess = await this.prisma.applicantProcess.findFirst({
      where: {
        processId: process.id,
        applicantId: userId,
      },
    });

    // Step 6: Include forms where applicantViewFormAfterCompletion is true
    if (applicantProcess) {
      const viewableForms = relatedProcessForms.filter(
        (pf) => pf.applicantViewFormAfterCompletion,
      );

      for (const viewableForm of viewableForms) {
        const formResponse = await this.prisma.formResponse.findFirst({
          where: {
            formId: viewableForm.formId,
            applicantProcessId,
          },
        });

        if (formResponse) {
          const formData = await this.prisma.form.findUnique({
            where: { id: formResponse.formId },
          });
          const formResult = {
            formName: formData?.name || 'Untitled Form',
            ...formResponse,
          };
          // Avoid duplicating the main response
          if (formResponse.formId !== formId) {
            responses.push(formResult);
          }
        }
      }
    }

    return {
      success: true,
      responses,
    };
  }
}
