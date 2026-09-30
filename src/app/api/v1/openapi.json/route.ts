import { NextRequest, NextResponse } from 'next/server';
import { buildOpenApiDocument } from '@/lib/api/openapi';

/** Public, unauthenticated: the machine-readable description of the v1 API. */
export async function GET(request: NextRequest) {
  return NextResponse.json(buildOpenApiDocument(new URL(request.url).origin));
}
