import * as bcrypt from 'bcrypt';
import { PrismaClient } from 'db/client';

export async function seedAdminUser(prisma: PrismaClient) {
  try {
    console.log('Starting admin user seeding...');

    // Step 1: Fetch Existing Admin and User Roles
    const adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' }
    });
    const userRole = await prisma.role.findFirst({
      where: { name: 'User' }
    });

    if (!adminRole || !userRole) {
      throw new Error('Admin or User role not found in roles table. Please seed both roles first.');
    }
    console.log('Roles found:', adminRole.name, userRole.name);

    // Step 2: Seed Admin User
    const adminEmail = 'tech@uzabox.com';
    const adminPassword = "c0t3_d'1v01r3";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = {
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      status: 'ENABLED' as const,
    };

    let user = await prisma.user.findFirst({
      where: { email: adminUser.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: adminUser,
      });
      console.log(`User "${adminUser.email}" seeded successfully.`);
    } else {
      console.log(`User "${adminUser.email}" already exists. Skipping.`);
    }

    // Step 3: Seed User-Role Relationships for both Admin and User roles
    const rolesToSeed = [
      { roleId: adminRole.id, roleName: 'Admin' },
      { roleId: userRole.id, roleName: 'User' }
    ];

    for (const role of rolesToSeed) {
      const userRoleData = {
        userId: user.id,
        roleId: role.roleId,
        status: 'ENABLED' as const,
      };

      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: role.roleId,
        },
      });

      if (!existingUserRole) {
        await prisma.userRole.create({
          data: userRoleData,
        });
        console.log(`"${role.roleName}" role seeded successfully for user.`);
      } else {
        console.log(`"${role.roleName}" role already exists for user. Skipping.`);
      }
    }

    console.log('Admin user seeding with both roles completed.');
  } catch (error) {
    console.error('Error seeding admin user:', error);
    throw error;
  }
}
