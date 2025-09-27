import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { seedRoles } from './roles.seed';
import { seedAdminUser } from './admin.seed';

@Injectable()
export class SeedingService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      console.log('Starting database seeding on app startup...');

      // Seed roles first (required for admin user)
      await seedRoles(this.prisma);

      // Seed admin user (depends on roles)
      await seedAdminUser(this.prisma);

      console.log('Database seeding on app startup completed successfully!');
    } catch (error) {
      console.error('Error during seeding on app startup:', error);
      // Don't throw error to prevent app from crashing, but log it
    }
  }
}
