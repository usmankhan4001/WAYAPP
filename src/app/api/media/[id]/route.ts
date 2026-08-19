import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { requireAuth } from '@/lib/auth/rbac';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const SAFE_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'application/pdf',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`media:${clientIp}`, { limit: 120, windowSeconds: 60 });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many media requests' }, { status: 429 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const client = await WhatsAppClient.createFromSettings();
    const metadata = await client.fetchMediaMetadata(id);

    if (!metadata || !metadata.url) {
      return NextResponse.json(
        { error: 'Media metadata not found or access expired on Meta servers' },
        { status: 404 }
      );
    }

    const mediaStream = await client.downloadMediaStream(metadata.url);
    if (!mediaStream || !mediaStream.buffer) {
      return NextResponse.json(
        { error: 'Failed to download media content from Meta CDN' },
        { status: 502 }
      );
    }

    // Convert Buffer to Uint8Array for Next.js Response body
    const bodyBytes = new Uint8Array(mediaStream.buffer);

    // Serve only whitelisted content types; anything else is forced to a safe
    // attachment download to prevent stored-XSS via SVG/HTML payloads
    const rawType = metadata.mime_type || mediaStream.contentType || 'application/octet-stream';
    const safeType = SAFE_MEDIA_TYPES.has(rawType) ? rawType : 'application/octet-stream';
    const inline = safeType.startsWith('image/') || safeType.startsWith('video/') || safeType.startsWith('audio/');

    return new Response(bodyBytes, {
      status: 200,
      headers: {
        'Content-Type': safeType,
        'Content-Length': bodyBytes.length.toString(),
        'Content-Disposition': inline ? 'inline' : 'attachment',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    console.error('Media streaming error:', error);
    return NextResponse.json({ error: error.message || 'Streaming failed' }, { status: 500 });
  }
}