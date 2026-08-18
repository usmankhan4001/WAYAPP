import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    const payload = JSON.stringify({
      event: 'ping.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test ping from WAYAPP outbound webhook engine.',
        endpointId: endpoint.id,
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(`${timestamp}.${payload}`, 'utf8')
      .digest('hex');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const startTime = Date.now();
    let resStatus = 0;
    let resBody = '';

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WAYAPP-Signature': signature,
          'X-WAYAPP-Timestamp': timestamp,
          'X-WAYAPP-Event': 'ping.test',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      resStatus = res.status;
      resBody = await res.text().catch(() => '');
    } catch (err: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: false,
        error: err.message || 'Connection timed out or failed to reach URL',
        durationMs: Date.now() - startTime,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: resStatus >= 200 && resStatus < 300,
      statusCode: resStatus,
      durationMs: Date.now() - startTime,
      responsePreview: resBody.substring(0, 300),
    });
  } catch (error: any) {
    logger.error({ error }, 'Error sending test webhook');
    return NextResponse.json({ error: 'Failed to test endpoint' }, { status: 500 });
  }
}
