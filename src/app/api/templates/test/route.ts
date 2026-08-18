import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, templateName, languageCode, headerMediaUrl, bodyVariables, templateComponents } = body;

    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Recipient phone number and template name are required' },
        { status: 400 }
      );
    }

    let components = templateComponents;
    if (!components) {
      const tpl = await prisma.template.findFirst({
        where: { name: templateName },
      });
      if (tpl?.components) {
        components = tpl.components;
      }
    }

    const client = await WhatsAppClient.createFromSettings();
    const result = await client.sendTemplateMessage({
      to,
      templateName,
      languageCode: languageCode || 'en_US',
      headerMediaUrl,
      bodyVariables: bodyVariables || [],
      templateComponents: components,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Test template message successfully dispatched to ${to}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
