import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getProcesses(): Promise<any[]> {
    const processes = await this.prisma.process.findMany({
      include: {
        group: true,
        applicantProcesses: {
          include: {
            applicant: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return processes.map(process => ({
      _id: process.id,
      name: process.name,
      group: process.group,
      applications: process.applicantProcesses,
    }));
  }

  async getProcessApplications(processId: string): Promise<any[]> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: {
        applicantProcesses: {
          include: {
            applicant: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            responses: {
              include: {
                form: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!process) {
      return [];
    }

    return process.applicantProcesses.map(applicantProcess => ({
      applicant: applicantProcess.applicant,
      responses: applicantProcess.responses,
    }));
  }
}
