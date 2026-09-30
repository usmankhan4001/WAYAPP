import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

/** Remove one tag from a contact. `[tag]` is the tag id or its exact name (URL-encoded). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; tag: string }> }) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id, tag: tagRef } = await params;
    const ref = decodeURIComponent(tagRef);
    const tag = await prisma.tag.findFirst({ where: { OR: [{ id: ref }, { name: ref }] }, select: { id: true } });
    if (!tag) return apiError('Tag not found', 'not_found', 404);

    const res = await prisma.contactsOnTags.deleteMany({ where: { contactId: id, tagId: tag.id } });
    if (res.count === 0) return apiError('That contact does not have this tag', 'not_found', 404);

    void emitWebhook('contact.updated', { contactId: id, changed: ['tags'] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact remove tag');
    return apiError('Failed to remove tag', 'internal_error', 500);
  }
}
