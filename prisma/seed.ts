import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WAYAPP database idempotently...');

  // Default Production Settings
  const randomVerifyToken = crypto.randomUUID().replace(/-/g, '');
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'My WhatsApp Business',
      businessPhone: '',
      defaultCountryCode: '+1',
      rateLimitPerSecond: 20,
      tierDailyLimit: 1000,
      qualityRating: 'GREEN',
      isMockMode: false,
      isConnected: false,
      webhookVerifyToken: randomVerifyToken,
    },
  });

  // Default Auth Config
  await prisma.authConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      requireAuth: true,
      allowRegistration: true,
    },
  });

  // Default Super Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  await prisma.user.upsert({
    where: { email: 'admin@gccstartup.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@gccstartup.com',
      name: 'GCC Super Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      status: 'ACTIVE',
    },
  });

  // Default Tags & Groups
  await prisma.tag.upsert({
    where: { name: 'VIP' },
    update: {},
    create: { name: 'VIP', color: '#F59E0B' },
  });

  await prisma.tag.upsert({
    where: { name: 'Lead' },
    update: {},
    create: { name: 'Lead', color: '#3B82F6' },
  });

  await prisma.tag.upsert({
    where: { name: 'Customer' },
    update: {},
    create: { name: 'Customer', color: '#10B981' },
  });

  await prisma.contactGroup.upsert({
    where: { name: 'All Customers' },
    update: {},
    create: {
      name: 'All Customers',
      description: 'Default master group for all customers',
      color: '#25D366',
    },
  });

  console.log('Database seeded safely and idempotently!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
