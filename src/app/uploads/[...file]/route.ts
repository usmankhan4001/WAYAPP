import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePathSegments = resolvedParams.file || [];
    const fileName = filePathSegments.join('/');

    // Security: Prevent directory traversal
    if (fileName.includes('..') || fileName.includes('\0')) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    // Try finding the file in public/uploads or uploads directory
    const candidates = [
      path.join(process.cwd(), 'public', 'uploads', fileName),
      path.join(process.cwd(), 'uploads', fileName),
    ];

    let targetPath: string | null = null;
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        targetPath = candidate;
        break;
      }
    }

    if (!targetPath) {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileBuffer = await readFile(targetPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Internal error loading media', { status: 500 });
  }
}
