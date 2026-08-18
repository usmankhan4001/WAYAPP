import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function POST() {
  try {
    await ensureDatabaseSchema();
    const client = await WhatsAppClient.createFromSettings();
    const metaTemplates = await client.fetchTemplates();

    let syncedCount = 0;

    for (const tpl of metaTemplates) {
      await prisma.template.upsert({
        where: { metaId: tpl.id },
        update: {
          name: tpl.name,
          language: tpl.language,
          category: tpl.category,
          status: tpl.status,
          components: JSON.stringify(tpl.components),
          rawJson: JSON.stringify(tpl),
          syncedAt: new Date(),
        },
        create: {
          metaId: tpl.id,
          name: tpl.name,
          language: tpl.language,
          category: tpl.category,
          status: tpl.status,
          components: JSON.stringify(tpl.components),
          rawJson: JSON.stringify(tpl),
          syncedAt: new Date(),
        },
      });
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      message: `Successfully synchronized ${syncedCount} templates from Meta WhatsApp Cloud.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
