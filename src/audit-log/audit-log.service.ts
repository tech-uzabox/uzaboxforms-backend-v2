import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuditLog, Prisma } from 'db/client';

import { PrismaService } from '../db/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details
            ? JSON.parse(JSON.stringify(entry.details))
            : undefined,
          status: entry.status,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write audit log:', error);
    }
  }
  async findAllPaginated(queryDto: AuditLogQueryDto): Promise<{
    data: AuditLog[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (resource) {
      where.resource = { contains: resource, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (startDate) {
      where.timestamp = { gte: startDate };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.timestamp = {
        ...(where.timestamp as { gte: Date }),
        lte: endOfDay,
      };
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
        // Search in user fields
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        // Search JSON details stringified (fallback):
        { details: { equals: search as any } },
      ];
    }

    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      });
      const count = await this.prisma.auditLog.count({ where });

      return {
        data: auditLogs,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve audit logs:', error);
      throw new InternalServerErrorException('Failed to retrieve audit logs.');
    }
  }
  async getAuditLogTypes() {
    const logs = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: {
        action: true,
      },
    });
    return logs.map((log) => log.action);
  }

  async getAuditLogAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const whereClause: any = {};
    
    if (filters?.startDate && filters?.endDate) {
      whereClause.timestamp = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }
    
    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    const [
      totalLogs,
      successLogs,
      failureLogs,
      topActions,
      topUsersRaw,
      recentActivity,
    ] = await Promise.all([
      // Total logs count
      this.prisma.auditLog.count({ where: whereClause }),
      
      // Success logs count
      this.prisma.auditLog.count({ 
        where: { ...whereClause, status: 'SUCCESS' } 
      }),
      
      // Failure logs count
      this.prisma.auditLog.count({ 
        where: { ...whereClause, status: 'FAILURE' } 
      }),
      
      // Top actions
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      
      // Top users
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...whereClause, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      
      // Recent activity
      this.prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    const successRate = totalLogs > 0 ? (successLogs / totalLogs) * 100 : 0;

    // Enrich top users with profile info
    const userIds = topUsersRaw.map(t => t.userId).filter(Boolean) as string[];
    const usersMap = userIds.length > 0
      ? (await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {} as Record<string, any>)
      : {};

    return {
      totalLogs,
      successLogs,
      failureLogs,
      successRate: Math.round(successRate * 100) / 100,
      topActions: topActions.map(item => ({
        action: item.action,
        count: item._count.action,
        percentage: totalLogs > 0 ? Math.round((item._count.action / totalLogs) * 10000) / 100 : 0,
      })),
      topUsers: topUsersRaw.map(item => {
        const u = item.userId ? usersMap[item.userId] : null;
        return {
          userId: item.userId,
          count: item._count.userId,
          percentage: totalLogs > 0 ? Math.round((item._count.userId / totalLogs) * 10000) / 100 : 0,
          user: u
            ? {
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
              }
            : null,
        };
      }),
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        user: log.user ? {
          id: log.user.id,
          email: log.user.email,
          name: log.user.firstName && log.user.lastName 
            ? `${log.user.firstName} ${log.user.lastName}` 
            : log.user.email,
        } : null,
        status: log.status,
        resource: log.resource,
      })),
    };
  }
}
