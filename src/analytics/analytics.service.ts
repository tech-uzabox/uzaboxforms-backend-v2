import { Injectable } from '@nestjs/common';
import { FormResponse } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async getFormAnalyticsData(
    processId: string,
    formId: string,
  ): Promise<FormResponse[]> {
    const data = await this.prisma.formResponse.findMany({
      where: { processId, formId },
    });
    await this.auditLogService.log({
      action: 'GET_FORM_ANALYTICS_DATA',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { processId, formId, count: data.length },
    });
    return data;
  }

  async getApplicationsAnalytics(): Promise<any> {
    // Use raw SQL for aggregation since Prisma doesn't support complex aggregations easily
    const analytics = await this.prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM "createdAt") as year,
        EXTRACT(MONTH FROM "createdAt") as month,
        COUNT(*) as count
      FROM "applicant_processes"
      GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
      ORDER BY year, month
    `;

    // Format the analytics to group by year
    const formattedAnalytics: Record<number, { month: number, count: number }[]> = {};

    (analytics as any[]).forEach(item => {
      const year = parseInt(item.year);
      const month = parseInt(item.month);
      const count = parseInt(item.count);

      if (!formattedAnalytics[year]) {
        formattedAnalytics[year] = [];
      }
      formattedAnalytics[year].push({ month, count });
    });

    await this.auditLogService.log({
      action: 'GET_APPLICATIONS_ANALYTICS',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { years: Object.keys(formattedAnalytics).length },
    });
    return formattedAnalytics;
  }

  async getProcessAnalytics(): Promise<any[]> {
    // Use raw SQL for aggregation with JOIN
    const analytics = await this.prisma.$queryRaw`
      SELECT
        p.id,
        p.name as "processName",
        COUNT(ap.id) as count
      FROM processes p
      LEFT JOIN applicant_processes ap ON p.id = ap."processId"
      GROUP BY p.id, p.name
      ORDER BY count DESC
    `;

    await this.auditLogService.log({
      action: 'GET_PROCESS_ANALYTICS',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { count: (analytics as any[]).length },
    });
    return analytics as any[];
  }

  async getFormResponseAnalytics(): Promise<any[]> {
    // Use raw SQL for aggregation with JOIN
    const analytics = await this.prisma.$queryRaw`
      SELECT
        f.id as "formId",
        f.name as "formName",
        COUNT(fr.id) as "responseCount"
      FROM forms f
      LEFT JOIN form_responses fr ON f.id = fr."formId"
      GROUP BY f.id, f.name
      ORDER BY "responseCount" DESC
    `;

    await this.auditLogService.log({
      action: 'GET_FORM_RESPONSE_ANALYTICS',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { count: (analytics as any[]).length },
    });
    return analytics as any[];
  }

  async getMonthlyApplicantProcessesCount(): Promise<any[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Use raw SQL for better performance with date operations
    const monthlyCounts = await this.prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR FROM "createdAt") as year,
        EXTRACT(MONTH FROM "createdAt") as month,
        COUNT(*) as count
      FROM applicant_processes
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
      ORDER BY year DESC, month DESC
    `;

    // Initialize an array to store counts for each month (last 12 months)
    const results: any[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // Find the count for this month from the aggregated data
      const monthData = (monthlyCounts as any[]).find(
        item => parseInt(item.year) === year && parseInt(item.month) === month
      );

      results.push({
        year,
        month,
        count: monthData ? parseInt(monthData.count) : 0,
      });
    }

    await this.auditLogService.log({
      action: 'GET_MONTHLY_APPLICANT_PROCESSES_COUNT',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { count: results.length },
    });
    return results;
  }

  async getProcessDistributionData(): Promise<any[]> {
    // Use raw SQL for efficient aggregation
    const results = await this.prisma.$queryRaw`
      SELECT
        p.name as label,
        COUNT(ap.id) as value
      FROM processes p
      LEFT JOIN applicant_processes ap ON p.id = ap."processId"
      GROUP BY p.id, p.name
      ORDER BY value DESC
    `;

    await this.auditLogService.log({
      action: 'GET_PROCESS_DISTRIBUTION_DATA',
      resource: 'Analytics',
      status: 'SUCCESS',
      details: { count: (results as any[]).length },
    });
    return results as any[];
  }
}
