import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { generateApiKey } from '@/lib/api/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const keys = await prisma.apiKey.findMany({
      where: { revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(keys);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching API keys');
    return NextResponse.json({ error: 'Failed to retrieve API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  try {
    const body = await request.json();
    const { name, scopes = 'read,write,messages:send,contacts:write', expiresInDays } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes,
        userId: session.userId,
        expiresAt,
      },
    });

    writeAuditLog({
      action: 'API_KEY_CREATED',
      actorId: session.userId,
      actorEmail: session.email,
      targetType: 'ApiKey',
      targetId: apiKey.id,
      detail: { name: apiKey.name, scopes },
      ipAddress: getClientIp(request),
    });

    // Return rawKey ONLY once on creation
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rawKey, // Shown once!
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error generating API key');
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}
