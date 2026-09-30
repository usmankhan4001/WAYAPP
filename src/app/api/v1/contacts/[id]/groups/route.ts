import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

const Body = z.object({ groupIds: z.array(z.string().min(1)).min(1).max(50) });

/** Add a contact to existing groups (by group id). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return apiError('groupIds must be a list of group ids', 'invalid_request', 400);

    const contact = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
    if (!contact) return apiError('Contact not found', 'not_found', 404);

    const groups = await prisma.contactGroup.findMany({
      where: { id: { in: parsed.data.groupIds } },
      select: { id: true },
    });
    if (groups.length !== new Set(parsed.data.groupIds).size) {
      return apiError('One or more groups were not found', 'not_found', 404);
    }

    for (const g of groups) {
      await prisma.contactsOnGroups.upsert({
        where: { contactId_groupId: { contactId: id, groupId: g.id } },
        update: {},
        create: { contactId: id, groupId: g.id },
      });
    }

    void emitWebhook('contact.updated', { contactId: id, changed: ['groups'] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact add groups');
    return apiError('Failed to add to groups', 'internal_error', 500);
  }
}
