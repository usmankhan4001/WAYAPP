import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth/rbac';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024, // 5MB
  video: 16 * 1024 * 1024, // 16MB
  audio: 16 * 1024 * 1024, // 16MB
  document: 100 * 1024 * 1024, // 100MB
};

// Strict allow-list: HTML/SVG/XML/JS are rejected outright (stored-XSS risk
// when served back from the same origin)
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
};

function getMediaTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`media-upload:${clientIp}`, { limit: 60, windowSeconds: 60 });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many upload requests' }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const allowedExt = ALLOWED_MIME_TYPES[mimeType];
    if (!allowedExt) {
      return NextResponse.json(
        {
          error: `File type "${mimeType}" is not allowed. Supported types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        },
        { status: 415 }
      );
    }

    const mediaType = getMediaTypeFromMime(mimeType);
    const maxSize = MAX_FILE_SIZES[mediaType] || MAX_FILE_SIZES.document;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum WhatsApp limit for ${mediaType} (${maxSize / (1024 * 1024)}MB).`,
        },
        { status: 400 }
      );
    }

    // Read bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extension derived from the server-side allow-list, never from the
    // client-provided filename
    const hash = crypto.randomBytes(12).toString('hex');
    const safeName = `${Date.now()}_${hash}${allowedExt}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, safeName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name || safeName,
      mediaType,
      mimeType,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: error.message || 'Media upload failed' }, { status: 500 });
  }
}
