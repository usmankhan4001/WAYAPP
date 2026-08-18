import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    return new Response(bodyBytes, {
      status: 200,
      headers: {
        'Content-Type': metadata.mime_type || mediaStream.contentType || 'application/octet-stream',
        'Content-Length': bodyBytes.length.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    console.error('Media streaming error:', error);
    return NextResponse.json({ error: error.message || 'Streaming failed' }, { status: 500 });
  }
}
