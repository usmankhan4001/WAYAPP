import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Initializing clean production database for WhatsApp Platform...');

  // Delete any existing demo records to give a clean slate
  await prisma.chatMessage.deleteMany({});
  await prisma.campaignMessage.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.contactsOnTags.deleteMany({});
  await prisma.contactsOnGroups.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.contactGroup.deleteMany({});
  await prisma.template.deleteMany({});

  // Initialize Default Production Settings
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
      webhookVerifyToken: 'whatsapp_cloud_webhook_token_2026',
    },
  });

  console.log('Database initialized with clean production state!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
