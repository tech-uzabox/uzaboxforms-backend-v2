import { PrismaClient } from 'db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from './seeds/roles.seed';
import { seedAdminUser } from './seeds/admin.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: adapter,
});

async function main() {
  try {
    console.log('Starting database seeding...');
    
    // Seed roles first (required for admin user)
    await seedRoles();
    
    // Seed admin user (depends on roles)
    await seedAdminUser();
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();