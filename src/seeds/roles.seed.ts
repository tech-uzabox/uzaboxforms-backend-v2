import { PrismaClient } from 'db/client';

export async function seedRoles(prisma: PrismaClient) {
  try {
    console.log('Starting role seeding...');

    const roles = [
      {
        name: 'Pending',
        description: 'Assigned to users awaiting verification, granting limited system access.',
        status: 'ENABLED' as const,
      },
      {
        name: 'Admin',
        description: 'Designated for system administrators with full control and access to all system features.',
        status: 'ENABLED' as const,
      },
      {
        name: 'User',
        description: 'For standard users with access to core system functionalities.',
        status: 'ENABLED' as const,
      },
      {
        name: 'Staff',
        description: 'For organizational staff members with access to specific operational tools and resources.',
        status: 'ENABLED' as const,
      },
      {
        name: 'QR-Code generator',
        description: 'Grants permissions to generate QR codes for authorized users.',
        status: 'ENABLED' as const,
      },
      {
        name: 'QR-Code all documents verifier',
        description: 'Authorizes verification of all QR code-generated documents across the system.',
        status: 'ENABLED' as const,
      },
      {
        name: 'Uza Ask AI',
        description: 'Allows access to the Uza Ask AI to get analytics and insights on the platform.',
        status: 'ENABLED' as const,
      },
    ];

    // Check and seed roles
    for (const role of roles) {
      const existingRole = await prisma.role.findFirst({
        where: { name: role.name }
      });

      if (!existingRole) {
        await prisma.role.create({
          data: role,
        });
        console.log(`Role "${role.name}" seeded successfully.`);
      } else {
        console.log(`Role "${role.name}" already exists. Skipping.`);
      }
    }

    console.log('Role seeding completed.');
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  }
}
