import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDatabaseSchema();
    const templates = await prisma.template.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDatabaseSchema();
    const body = await request.json();
    const { name, category, language, components } = body;

    if (!name || !category || !language) {
      return NextResponse.json(
        { error: 'Template name, category, and language are required' },
        { status: 400 }
      );
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Create via Meta API
    const client = await WhatsAppClient.createFromSettings();
    const metaRes = await client.createTemplate({
      name: cleanName,
      category,
      language,
      components,
    });

    const template = await prisma.template.upsert({
      where: { metaId: metaRes.id },
      update: {
        name: cleanName,
        category,
        language,
        status: metaRes.status,
        components: JSON.stringify(components),
      },
      create: {
        metaId: metaRes.id,
        name: cleanName,
        category,
        language,
        status: metaRes.status,
        components: JSON.stringify(components),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
