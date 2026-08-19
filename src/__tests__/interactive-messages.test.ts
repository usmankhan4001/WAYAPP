import { describe, it, expect } from 'vitest';
import { WhatsAppClient } from '@/lib/whatsapp/client';

describe('WhatsAppClient Interactive Messages (Meta Graph API v21.0)', () => {
  it('should format and send an interactive list message in mock mode', async () => {
    const client = new WhatsAppClient({ isMockMode: true });

    const response = await client.sendListMessage({
      to: '+971501234567',
      body: 'What is your business activity?',
      buttonText: 'Select Activity',
      header: 'Business Setup',
      footer: 'GCCStartup Advisory',
      sections: [
        {
          title: 'Popular Sectors',
          rows: [
            {
              id: 'business_ecommerce',
              title: 'E-commerce',
              description: 'Online store, dropshipping, D2C',
            },
            {
              id: 'business_consulting',
              title: 'Consulting / Agency',
              description: 'Tech, marketing, management advisory',
            },
          ],
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.messaging_product).toBe('whatsapp');
    expect(response.messages).toHaveLength(1);
    expect(response.messages[0].id).toContain('wamid');
    expect(response.contacts[0].wa_id).toBe('971501234567');
  });

  it('should format and send interactive reply buttons in mock mode', async () => {
    const client = new WhatsAppClient({ isMockMode: true });

    const response = await client.sendReplyButtons({
      to: '+971501234567',
      body: 'Are you ready to proceed with company registration?',
      buttons: [
        { id: 'btn_yes', title: 'Yes, Proceed' },
        { id: 'btn_consult', title: 'Book Advisory' },
        { id: 'btn_later', title: 'Maybe Later' },
      ],
    });

    expect(response).toBeDefined();
    expect(response.messaging_product).toBe('whatsapp');
    expect(response.messages).toHaveLength(1);
    expect(response.messages[0].id).toContain('wamid');
  });

  it('should handle template quality_score object gracefully', async () => {
    const { prisma } = await import('@/lib/prisma');
    const rawQualityScoreObj = { score: 'UNKNOWN', date: 1787121531 };

    const qScore = typeof rawQualityScoreObj === 'object' && rawQualityScoreObj !== null
      ? (rawQualityScoreObj as any).score || 'GREEN'
      : rawQualityScoreObj;

    const tpl = await prisma.template.upsert({
      where: { metaId: 'test_meta_28687726467485739' },
      update: {
        name: 'gcc_initial_qualification_test',
        language: 'en',
        category: 'MARKETING',
        status: 'APPROVED',
        qualityScore: qScore,
        components: '[]',
      },
      create: {
        metaId: 'test_meta_28687726467485739',
        name: 'gcc_initial_qualification_test',
        language: 'en',
        category: 'MARKETING',
        status: 'APPROVED',
        qualityScore: qScore,
        components: '[]',
      },
    });

    expect(tpl.qualityScore).toBe('UNKNOWN');
  });
});
