import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;
  const { session } = authResult;

  try {
    const { id } = await params;
    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    writeAuditLog({
      action: 'API_KEY_REVOKED',
      actorId: session.userId,
      actorEmail: session.email,
      targetType: 'ApiKey',
      targetId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: 'API key revoked successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Error revoking API key');
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
