import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { encryptString, decryptString, maskSecret } from '@/lib/crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // 1. RBAC: Only Admins can view settings
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) {
    return authResult.response;
  }

  let settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  let authConfig = await prisma.authConfig.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 'default',
        businessName: 'My WhatsApp Business',
        isMockMode: false,
        isConnected: false,
        webhookVerifyToken: crypto.randomUUID().replace(/-/g, ''),
      },
    });
  }

  if (!authConfig) {
    authConfig = await prisma.authConfig.create({
      data: {
        id: 'default',
        allowedDomains: 'gccstartup.com',
        allowedEmails: '',
        requireAuth: true,
      },
    });
  }

  const rawAccessToken = decryptString(settings.accessToken);
  const rawAppSecret = decryptString(settings.appSecret);
  const rawMetaSecret = decryptString(authConfig?.metaAppSecret);

  // Return strictly sanitized fields (NO secret leaks)
  const safeSettings = {
    id: settings.id,
    wabaId: settings.wabaId,
    phoneNumberId: settings.phoneNumberId,
    businessName: settings.businessName,
    businessPhone: settings.businessPhone,
    defaultCountryCode: settings.defaultCountryCode,
    rateLimitPerSecond: settings.rateLimitPerSecond,
    tierDailyLimit: settings.tierDailyLimit,
    qualityRating: settings.qualityRating,
    isMockMode: settings.isMockMode,
    isConnected: settings.isConnected,
    marketingMessagesEnabled: settings.marketingMessagesEnabled ?? false,
    marketingMessagesPolicy: settings.marketingMessagesPolicy || 'CLOUD_API_FALLBACK',
    webhookVerifyToken: settings.webhookVerifyToken,
    accessTokenMasked: rawAccessToken ? maskSecret(rawAccessToken) : null,
    hasAppSecret: Boolean(rawAppSecret),
    metaAppId: authConfig?.metaAppId || '',
    hasMetaAppSecret: Boolean(rawMetaSecret),
    allowedDomains: authConfig?.allowedDomains || 'gccstartup.com',
    allowedEmails: authConfig?.allowedEmails || '',
    requireAuth: authConfig?.requireAuth ?? true,
    updatedAt: settings.updatedAt,
  };

  return NextResponse.json(safeSettings);
}

export async function POST(request: NextRequest) {
  // 1. RBAC: Only Admins can modify settings
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) {
    return authResult.response;
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`settings:${clientIp}`, { limit: 30, windowSeconds: 60 });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many settings requests' }, { status: 429 });
  }

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

    // Fetch existing credentials if unsupplied in request
    const existing = await prisma.settings.findUnique({ where: { id: 'default' } });
    const currentToken = accessToken && !accessToken.includes('••') && !accessToken.includes('...')
      ? accessToken.trim()
      : decryptString(existing?.accessToken) || '';

    // 1. Test Connection
    if (action === 'TEST_CONNECTION') {
      const client = new WhatsAppClient({
        wabaId,
        phoneNumberId,
        accessToken: currentToken,
        isMockMode: isMockMode ?? false,
      });

      const testResult = await client.testConnection();
      return NextResponse.json(testResult);
    }

    // 2. Register Phone Number
    if (action === 'REGISTER_PHONE') {
      const client = new WhatsAppClient({
        wabaId,
        phoneNumberId,
        accessToken: currentToken,
        isMockMode: isMockMode ?? false,
      });

      const pin = body.pin || '123456';
      const regResult = await client.registerPhoneNumber(pin);
      return NextResponse.json(regResult);
    }

    // 3. Activate Connection
    if (action === 'ACTIVATE_CONNECTION') {
      const client = new WhatsAppClient({
        wabaId,
        phoneNumberId,
        accessToken: currentToken,
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

      const encryptedToken = encryptString(currentToken);
      const encryptedSecret = appSecret && !appSecret.includes('••')
        ? encryptString(appSecret.trim())
        : existing?.appSecret;

      const updated = await prisma.settings.upsert({
        where: { id: 'default' },
        update: {
          wabaId: wabaId?.trim() || null,
          phoneNumberId: phoneNumberId?.trim() || null,
          accessToken: encryptedToken,
          webhookVerifyToken: webhookVerifyToken?.trim() || crypto.randomUUID().replace(/-/g, ''),
          appSecret: encryptedSecret,
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
          accessToken: encryptedToken,
          webhookVerifyToken: webhookVerifyToken?.trim() || crypto.randomUUID().replace(/-/g, ''),
          appSecret: encryptedSecret,
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
        settings: {
          ...updated,
          accessToken: undefined,
          appSecret: undefined,
          accessTokenMasked: maskSecret(currentToken),
        },
      });
    }

    // 4. Disconnect Meta
    if (action === 'DISCONNECT_META') {
      const updated = await prisma.settings.update({
        where: { id: 'default' },
        data: {
          isConnected: false,
        },
      });
      return NextResponse.json({
        success: true,
        isConnected: false,
        settings: { ...updated, accessToken: undefined, appSecret: undefined },
      });
    }

    // 5. Standard Save
    const dataToUpdate: any = {
      wabaId: wabaId?.trim() || null,
      phoneNumberId: phoneNumberId?.trim() || null,
      webhookVerifyToken: webhookVerifyToken?.trim() || crypto.randomUUID().replace(/-/g, ''),
      businessName: businessName?.trim() || 'My Business',
      businessPhone: businessPhone?.trim() || '+1234567890',
      defaultCountryCode: defaultCountryCode?.trim() || '+1',
      rateLimitPerSecond: Number(rateLimitPerSecond) || 20,
      tierDailyLimit: Number(tierDailyLimit) || 1000,
      isMockMode: Boolean(isMockMode),
      ...(body.marketingMessagesEnabled !== undefined ? { marketingMessagesEnabled: Boolean(body.marketingMessagesEnabled) } : {}),
      ...(body.marketingMessagesPolicy ? { marketingMessagesPolicy: String(body.marketingMessagesPolicy) } : {}),
    };

    if (isConnected !== undefined) {
      dataToUpdate.isConnected = Boolean(isConnected);
    }

    if (accessToken && !accessToken.includes('••') && !accessToken.includes('...')) {
      dataToUpdate.accessToken = encryptString(accessToken.trim());
    }

    if (appSecret && !appSecret.includes('••')) {
      dataToUpdate.appSecret = encryptString(appSecret.trim());
    }

    const updated = await prisma.settings.upsert({
      where: { id: 'default' },
      update: dataToUpdate,
      create: {
        id: 'default',
        ...dataToUpdate,
      },
    });

    // Also update AuthConfig if provided
    if (body.metaAppId !== undefined || body.metaAppSecret !== undefined || body.allowedDomains !== undefined) {
      const encryptedMetaSecret = body.metaAppSecret && !body.metaAppSecret.includes('••')
        ? encryptString(body.metaAppSecret.trim())
        : undefined;

      await prisma.authConfig.upsert({
        where: { id: 'default' },
        update: {
          metaAppId: body.metaAppId?.trim() || null,
          ...(encryptedMetaSecret ? { metaAppSecret: encryptedMetaSecret } : {}),
          allowedDomains: body.allowedDomains?.trim() || 'gccstartup.com',
          allowedEmails: body.allowedEmails?.trim() || '',
        },
        create: {
          id: 'default',
          metaAppId: body.metaAppId?.trim() || null,
          metaAppSecret: encryptedMetaSecret || null,
          allowedDomains: body.allowedDomains?.trim() || 'gccstartup.com',
          allowedEmails: body.allowedEmails?.trim() || '',
          requireAuth: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        accessToken: undefined,
        appSecret: undefined,
        accessTokenMasked: currentToken ? maskSecret(currentToken) : null,
      },
    });
  } catch (error: any) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
