import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { checkMarketingEligibility } from '@/lib/whatsapp/marketing-eligibility';
import { MessageRouter } from '@/lib/whatsapp/message-router';

describe('Marketing Messages API & Message Router', () => {
  beforeEach(async () => {
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: { isMockMode: true, marketingMessagesEnabled: true },
      create: { id: 'default', isMockMode: true, marketingMessagesEnabled: true },
    });
  });

  describe('checkMarketingEligibility', () => {
    it('should allow active contacts with approved marketing templates', async () => {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: '+971500000011' },
        update: { status: 'ACTIVE', optedOutAt: null },
        create: { phoneNumber: '+971500000011', status: 'ACTIVE' },
      });

      const result = await checkMarketingEligibility({
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateCategory: 'MARKETING',
        templateStatus: 'APPROVED',
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('OK');
    });

    it('should suppress contacts who have opted out', async () => {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: '+971500000012' },
        update: { status: 'UNSUBSCRIBED', optedOutAt: new Date() },
        create: { phoneNumber: '+971500000012', status: 'UNSUBSCRIBED', optedOutAt: new Date() },
      });

      const result = await checkMarketingEligibility({
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateCategory: 'MARKETING',
        templateStatus: 'APPROVED',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('OPTED_OUT');
    });

    it('should suppress contacts in ContactSuppression table', async () => {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: '+971500000013' },
        update: { status: 'ACTIVE', optedOutAt: null },
        create: { phoneNumber: '+971500000013', status: 'ACTIVE' },
      });

      await prisma.contactSuppression.create({
        data: {
          contactId: contact.id,
          type: 'GLOBAL_SUPPRESSION',
          reason: 'Customer requested do-not-contact',
        },
      });

      const result = await checkMarketingEligibility({
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateCategory: 'MARKETING',
        templateStatus: 'APPROVED',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('SUPPRESSED');
    });
  });

  describe('MessageRouter.routeAndSend', () => {
    it('should route marketing template to MARKETING_MESSAGES_API when enabled', async () => {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: '+971500000014' },
        update: { status: 'ACTIVE', optedOutAt: null },
        create: { phoneNumber: '+971500000014', status: 'ACTIVE' },
      });

      const result = await MessageRouter.routeAndSend({
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateName: 'gcc_initial_qualification',
        templateCategory: 'MARKETING',
        optimizationMode: 'OPTIMIZED',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('MARKETING_MESSAGES_API');
      expect(result.wamid).toBeDefined();
    });

    it('should route utility template to CLOUD_API', async () => {
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: '+971500000015' },
        update: { status: 'ACTIVE', optedOutAt: null },
        create: { phoneNumber: '+971500000015', status: 'ACTIVE' },
      });

      const result = await MessageRouter.routeAndSend({
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateName: 'order_status_update',
        templateCategory: 'UTILITY',
        optimizationMode: 'AUTO',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('CLOUD_API');
    });
  });
});
