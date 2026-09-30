import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const authResult = await authenticateApiRequest(request, 'contacts:read');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        groups: { include: { group: true } },
        chatMessages: { take: 10, orderBy: { timestamp: 'desc' } },
      },
    });

    if (!contact) return apiError('Contact not found', 'not_found', 404);
    return NextResponse.json(contact);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact get');
    return apiError('Failed to fetch contact', 'internal_error', 500);
  }
}

async function update(request: NextRequest, { params }: Ctx) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { firstName, lastName, email, customAttributes, status } = body;

    if (status !== undefined && !['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'BLOCKED'].includes(status)) {
      return apiError('status must be ACTIVE, UNSUBSCRIBED, BOUNCED or BLOCKED', 'invalid_request', 400);
    }
    if (email !== undefined && email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return apiError('email is not a valid address', 'invalid_request', 400);
    }

    const existing = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError('Contact not found', 'not_found', 404);

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(customAttributes !== undefined ? { customAttributes: JSON.stringify(customAttributes) } : {}),
        ...(status ? { status } : {}),
      },
    });

    const changed = Object.entries({ firstName, lastName, email, customAttributes, status })
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    void emitWebhook('contact.updated', { contactId: id, changed });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact update');
    return apiError('Failed to update contact', 'internal_error', 500);
  }
}

export const PUT = update;
export const PATCH = update;

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const existing = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return apiError('Contact not found', 'not_found', 404);
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact delete');
    return apiError('Failed to delete contact', 'internal_error', 500);
  }
}
