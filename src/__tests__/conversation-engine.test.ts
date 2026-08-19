import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  calculateLeadScore,
  processConversationEvent,
  GCC_STARTUP_FLOW,
} from '@/lib/whatsapp/conversation-engine';

describe('ConversationFlowEngine & Lead Qualification', () => {
  beforeEach(async () => {
    // Setup Mock Mode in Settings
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: { isMockMode: true },
      create: { id: 'default', isMockMode: true },
    });
  });

  describe('calculateLeadScore', () => {
    it('should calculate HOT lead score (>= 70) for immediate bank account clients', () => {
      const answers = {
        businessType: 'E-commerce',
        country: 'Netherlands',
        goal: 'Company + Bank Account',
        timeline: 'Immediately',
      };

      const result = calculateLeadScore(answers);
      expect(result.leadScore).toBeGreaterThanOrEqual(70);
      expect(result.leadTemperature).toBe('HOT');
    });

    it('should calculate WARM lead score (40 - 69) for 1-month company registration in Europe', () => {
      const answers = {
        businessType: 'Consulting / Agency',
        country: 'Germany',
        goal: 'Company Registration Only',
        timeline: 'Within 1 Month',
      };

      const result = calculateLeadScore(answers);
      expect(result.leadScore).toBeGreaterThanOrEqual(40);
      expect(result.leadScore).toBeLessThan(70);
      expect(result.leadTemperature).toBe('WARM');
    });

    it('should calculate COLD lead score (< 40) for exploring inquiries', () => {
      const answers = {
        businessType: 'Other Activities',
        country: 'Other Country',
        goal: 'Other / Custom Advisory',
        timeline: 'Just Exploring',
      };

      const result = calculateLeadScore(answers);
      expect(result.leadScore).toBeLessThan(40);
      expect(result.leadTemperature).toBe('COLD');
    });
  });

  describe('End-to-End GCC Qualification Session Flow', () => {
    it('should initiate a session and progress through all 4 steps to completion', async () => {
      const testPhone = '+971599990001';

      // 1. Create a test contact
      const contact = await prisma.contact.upsert({
        where: { phoneNumber: testPhone },
        update: { customAttributes: '{}' },
        create: {
          phoneNumber: testPhone,
          firstName: 'Jan',
          lastName: 'De Vries',
        },
      });

      // 2. Trigger Flow start via Quick Reply button ID
      const startHandled = await processConversationEvent({
        contactId: contact.id,
        phoneNumber: testPhone,
        wamid: `test_wamid_start_${Date.now()}`,
        messageType: 'interactive',
        bodyText: 'Start Qualification',
        interactiveId: 'start_qualification',
      });

      expect(startHandled).toBe(true);

      // Verify active session was created at Step 1 (business_type)
      const sessionAfterStart = await prisma.conversationSession.findFirst({
        where: { contactId: contact.id, status: 'ACTIVE' },
      });
      expect(sessionAfterStart).toBeDefined();
      expect(sessionAfterStart?.currentStep).toBe('business_type');

      // 3. Step 1: Select Business Activity (E-commerce)
      const step1Handled = await processConversationEvent({
        contactId: contact.id,
        phoneNumber: testPhone,
        wamid: `test_wamid_step1_${Date.now()}`,
        messageType: 'interactive',
        bodyText: 'E-commerce',
        interactiveId: 'business_ecommerce',
      });
      expect(step1Handled).toBe(true);

      const sessionAfterStep1 = await prisma.conversationSession.findUnique({
        where: { id: sessionAfterStart!.id },
      });
      expect(sessionAfterStep1?.currentStep).toBe('country');

      // 4. Step 2: Select Country (Netherlands)
      const step2Handled = await processConversationEvent({
        contactId: contact.id,
        phoneNumber: testPhone,
        wamid: `test_wamid_step2_${Date.now()}`,
        messageType: 'interactive',
        bodyText: 'Netherlands',
        interactiveId: 'country_netherlands',
      });
      expect(step2Handled).toBe(true);

      const sessionAfterStep2 = await prisma.conversationSession.findUnique({
        where: { id: sessionAfterStart!.id },
      });
      expect(sessionAfterStep2?.currentStep).toBe('goal');

      // 5. Step 3: Select Goal (Company + Bank Account)
      const step3Handled = await processConversationEvent({
        contactId: contact.id,
        phoneNumber: testPhone,
        wamid: `test_wamid_step3_${Date.now()}`,
        messageType: 'interactive',
        bodyText: 'Company + Bank Account',
        interactiveId: 'goal_company_bank',
      });
      expect(step3Handled).toBe(true);

      const sessionAfterStep3 = await prisma.conversationSession.findUnique({
        where: { id: sessionAfterStart!.id },
      });
      expect(sessionAfterStep3?.currentStep).toBe('timeline');

      // 6. Step 4: Select Timeline (Immediately) -> Completes Flow!
      const step4Handled = await processConversationEvent({
        contactId: contact.id,
        phoneNumber: testPhone,
        wamid: `test_wamid_step4_${Date.now()}`,
        messageType: 'interactive',
        bodyText: 'Immediately',
        interactiveId: 'timeline_immediately',
      });
      expect(step4Handled).toBe(true);

      // Verify session is marked COMPLETED
      const finalSession = await prisma.conversationSession.findUnique({
        where: { id: sessionAfterStart!.id },
      });
      expect(finalSession?.status).toBe('COMPLETED');
      expect(finalSession?.completedAt).toBeDefined();

      // Verify contact customAttributes updated with qualification data
      const updatedContact = await prisma.contact.findUnique({
        where: { id: contact.id },
      });
      const attributes = JSON.parse(updatedContact?.customAttributes || '{}');
      expect(attributes.businessType).toBe('E-commerce');
      expect(attributes.country).toBe('Netherlands');
      expect(attributes.goal).toBe('Company + Bank Account');
      expect(attributes.timeline).toBe('Immediately');
      expect(attributes.qualificationStatus).toBe('COMPLETED');
      expect(attributes.leadTemperature).toBe('HOT');
      expect(attributes.leadScore).toBeGreaterThanOrEqual(70);

      // Verify GCC Qualified tag was assigned
      const assignedTags = await prisma.contactsOnTags.findMany({
        where: { contactId: contact.id },
        include: { tag: true },
      });
      const tagNames = assignedTags.map((t) => t.tag.name);
      expect(tagNames).toContain('GCC Qualified');
      expect(tagNames).toContain('HOT Lead 🔥');

      // Verify conversion event logged
      const conversionEvent = await prisma.conversionEvent.findFirst({
        where: { contactId: contact.id, eventName: 'QualifiedLead' },
      });
      expect(conversionEvent).toBeDefined();
    });
  });
});
