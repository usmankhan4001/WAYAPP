import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

/** Remove a contact from one group. `[group]` is the group id. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; group: string }> }) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id, group } = await params;
    const res = await prisma.contactsOnGroups.deleteMany({ where: { contactId: id, groupId: group } });
    if (res.count === 0) return apiError('That contact is not in this group', 'not_found', 404);

    void emitWebhook('contact.updated', { contactId: id, changed: ['groups'] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact remove group');
    return apiError('Failed to remove from group', 'internal_error', 500);
  }
}
