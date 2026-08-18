import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact get');
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { firstName, lastName, email, customAttributes, status } = body;

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

    return NextResponse.json({ success: true, contact: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact update');
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact delete');
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
