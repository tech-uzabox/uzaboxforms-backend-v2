import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getChatsByUserId({
    userId,
    limit = 10,
    startingAfter,
    endingBefore,
  }: {
    userId: string;
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
  }) {
    try {
      const extendedLimit = limit + 1;

      let whereCondition: any = {
        userId,
      };

      if (startingAfter) {
        // Get the chat to use as reference point
        const referenceChat = await this.prisma.chat.findUnique({
          where: { id: startingAfter },
        });

        if (!referenceChat) {
          throw new Error(`Chat with id ${startingAfter} not found`);
        }

        whereCondition.createdAt = {
          gt: referenceChat.createdAt,
        };
      } else if (endingBefore) {
        // Get the chat to use as reference point
        const referenceChat = await this.prisma.chat.findUnique({
          where: { id: endingBefore },
        });

        if (!referenceChat) {
          throw new Error(`Chat with id ${endingBefore} not found`);
        }

        whereCondition.createdAt = {
          lt: referenceChat.createdAt,
        };
      }

      const chats = await this.prisma.chat.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc',
        },
        take: extendedLimit,
        select: {
          id: true,
          title: true,
          createdAt: true,
          userId: true,
          visibility: true,
        },
      });

      const hasMore = chats.length > limit;

      return {
        chats: hasMore ? chats.slice(0, limit) : chats,
        hasMore,
      };
    } catch (error) {
      console.error('Failed to get chats by user from database', error);
      throw error;
    }
  }
}
