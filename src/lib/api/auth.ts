import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionToken } from '@/lib/auth/jwt';

export interface ApiAuthContext {
  authenticated: boolean;
  type: 'API_KEY' | 'BEARER_JWT' | 'SESSION';
  userId?: string;
  keyId?: string;
  scopes: string[];
}

/**
 * Computes SHA-256 hash of API key
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

/**
 * Generates a new cryptographically secure API key
 * Format: way_live_<32_hex_chars>
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `way_live_${randomBytes}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Authenticates request via X-API-Key header, Bearer JWT, or session cookie
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredScope?: string
): Promise<{ auth: ApiAuthContext } | { response: NextResponse }> {
  // 1. Check X-API-Key Header
  const apiKeyHeader = request.headers.get('x-api-key')?.trim();
  if (apiKeyHeader) {
    const keyHash = hashApiKey(apiKeyHeader);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
      return {
        response: NextResponse.json(
          { error: 'Unauthorized: Invalid or revoked API key' },
          { status: 401 }
        ),
      };
    }

    const scopes = apiKey.scopes.split(',').map((s) => s.trim());
    if (requiredScope && !scopes.includes('*') && !scopes.includes(requiredScope)) {
      return {
        response: NextResponse.json(
          { error: `Forbidden: API key lacks required scope: ${requiredScope}` },
          { status: 403 }
        ),
      };
    }

    // Update lastUsedAt asynchronously
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      auth: {
        authenticated: true,
        type: 'API_KEY',
        keyId: apiKey.id,
        userId: apiKey.userId || undefined,
        scopes,
      },
    };
  }

  // 2. Check Bearer JWT Header or Session Cookie
  let token: string | undefined;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = request.cookies.get('wayapp_session')?.value;
  }

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      return {
        auth: {
          authenticated: true,
          type: 'BEARER_JWT',
          userId: payload.userId,
          scopes: ['*'], // Full scopes for authenticated dashboard user
        },
      };
    }
  }

  return {
    response: NextResponse.json(
      { error: 'Unauthorized: Missing or invalid API Key / Bearer token' },
      { status: 401 }
    ),
  };
}
