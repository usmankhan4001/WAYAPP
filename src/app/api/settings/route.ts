import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function GET() {
  let settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 'default',
        businessName: 'My WhatsApp Business',
        isMockMode: false,
        isConnected: false,
        webhookVerifyToken: 'whatsapp_wati_webhook_secret_2026',
      },
    });
  }

  // Mask access token for security
  const safeSettings = {
    ...settings,
    accessTokenMasked: settings.accessToken
      ? `${settings.accessToken.substring(0, 8)}...${settings.accessToken.substring(settings.accessToken.length - 6)}`
      : null,
  };

  return NextResponse.json(safeSettings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      wabaId,
      phoneNumberId,
      accessToken,
      webhookVerifyToken,
      appSecret,
      businessName,
      businessPhone,
      defaultCountryCode,
      rateLimitPerSecond,
      tierDailyLimit,
      isMockMode,
      isConnected,
      action,
    } = body;

    // 1. If user clicked "Test Connection"
    if (action === 'TEST_CONNECTION') {
      const client = new WhatsAppClient({
        wabaId,
        phoneNumberId,
        accessToken,
        isMockMode: isMockMode ?? false,
      });

      const testResult = await client.testConnection();
      return NextResponse.json(testResult);
    }

    // 2. If user is activating the connection from Setup Wizard
    if (action === 'ACTIVATE_CONNECTION') {
      const client = new WhatsAppClient({
        wabaId,
        phoneNumberId,
        accessToken,
        isMockMode: isMockMode ?? false,
      });

      const testResult = await client.testConnection();
      if (!testResult.success) {
        return NextResponse.json({
          success: false,
          error: testResult.message || 'Failed to authenticate with Meta Cloud API',
        }, { status: 400 });
      }

      const verifiedPhone = testResult.phoneDetails?.display_phone_number || businessPhone || '+1234567890';
      const verifiedName = testResult.phoneDetails?.verified_name || businessName || 'My WhatsApp Business';

      const updated = await prisma.settings.upsert({
        where: { id: 'default' },
        update: {
          wabaId: wabaId?.trim() || null,
          phoneNumberId: phoneNumberId?.trim() || null,
          accessToken: accessToken && !accessToken.includes('...') ? accessToken.trim() : undefined,
          webhookVerifyToken: webhookVerifyToken?.trim() || 'whatsapp_wati_webhook_secret_2026',
          appSecret: appSecret?.trim() || null,
          businessName: verifiedName,
          businessPhone: verifiedPhone,
          defaultCountryCode: defaultCountryCode?.trim() || '+1',
          rateLimitPerSecond: Number(rateLimitPerSecond) || 20,
          tierDailyLimit: Number(tierDailyLimit) || 1000,
          isMockMode: Boolean(isMockMode),
          isConnected: true,
        },
        create: {
          id: 'default',
          wabaId: wabaId?.trim() || null,
          phoneNumberId: phoneNumberId?.trim() || null,
          accessToken: accessToken?.trim() || null,
          webhookVerifyToken: webhookVerifyToken?.trim() || 'whatsapp_wati_webhook_secret_2026',
          appSecret: appSecret?.trim() || null,
          businessName: verifiedName,
          businessPhone: verifiedPhone,
          defaultCountryCode: defaultCountryCode?.trim() || '+1',
          rateLimitPerSecond: Number(rateLimitPerSecond) || 20,
          tierDailyLimit: Number(tierDailyLimit) || 1000,
          isMockMode: Boolean(isMockMode),
          isConnected: true,
        },
      });

      return NextResponse.json({
        success: true,
        isConnected: true,
        message: 'Meta WhatsApp Cloud API Connection Activated Successfully!',
        settings: updated,
      });
    }

    // 3. If user clicked "Disconnect Meta"
    if (action === 'DISCONNECT_META') {
      const updated = await prisma.settings.update({
        where: { id: 'default' },
        data: {
          isConnected: false,
        },
      });
      return NextResponse.json({ success: true, isConnected: false, settings: updated });
    }

    // 4. Standard Save
    const dataToUpdate: any = {
      wabaId: wabaId?.trim() || null,
      phoneNumberId: phoneNumberId?.trim() || null,
      webhookVerifyToken: webhookVerifyToken?.trim() || 'whatsapp_wati_webhook_secret_2026',
      appSecret: appSecret?.trim() || null,
      businessName: businessName?.trim() || 'My Business',
      businessPhone: businessPhone?.trim() || '+1234567890',
      defaultCountryCode: defaultCountryCode?.trim() || '+1',
      rateLimitPerSecond: Number(rateLimitPerSecond) || 20,
      tierDailyLimit: Number(tierDailyLimit) || 1000,
      isMockMode: Boolean(isMockMode),
    };

    if (isConnected !== undefined) {
      dataToUpdate.isConnected = Boolean(isConnected);
    }

    if (accessToken && !accessToken.includes('...')) {
      dataToUpdate.accessToken = accessToken.trim();
    }

    const updated = await prisma.settings.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: {
        id: 'default',
        ...dataToUpdate,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
