import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

const Body = z.object({ tags: z.array(z.string().trim().min(1)).min(1).max(50) });

/** Add tags to a contact by name. Tags that do not exist yet are created. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return apiError('tags must be a list of tag names', 'invalid_request', 400);

    const contact = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
    if (!contact) return apiError('Contact not found', 'not_found', 404);

    for (const name of parsed.data.tags) {
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.contactsOnTags.upsert({
        where: { contactId_tagId: { contactId: id, tagId: tag.id } },
        update: {},
        create: { contactId: id, tagId: tag.id },
      });
    }

    void emitWebhook('contact.updated', { contactId: id, changed: ['tags'] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact add tags');
    return apiError('Failed to add tags', 'internal_error', 500);
  }
}
