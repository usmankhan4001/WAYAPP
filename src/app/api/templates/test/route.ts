import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, templateName, languageCode, headerMediaUrl, bodyVariables } = body;

    if (!to || !templateName) {
      return NextResponse.json(
        { error: 'Recipient phone number and template name are required' },
        { status: 400 }
      );
    }

    const client = await WhatsAppClient.createFromSettings();
    const result = await client.sendTemplateMessage({
      to,
      templateName,
      languageCode: languageCode || 'en_US',
      headerMediaUrl,
      bodyVariables: bodyVariables || [],
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Test template message successfully dispatched to ${to}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
