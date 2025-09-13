import { PrismaClient } from 'db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, OnModuleInit } from '@nestjs/common';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      // log: ['info', 'query', 'warn'],
      errorFormat: 'pretty',
      adapter: adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
