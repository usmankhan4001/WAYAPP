import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { logger } from '@/lib/logger';

const ContactCreateSchema = z.object({
  phoneNumber: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  customAttributes: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'contacts:read');
  if ('response' in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const cursor = searchParams.get('cursor');
    const search = searchParams.get('search')?.trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        tags: { include: { tag: true } },
        groups: { include: { group: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | null = null;
    if (contacts.length > limit) {
      const nextItem = contacts.pop();
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json({
      data: contacts,
      pagination: {
        nextCursor,
        limit,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contacts list');
    return NextResponse.json({ error: 'Failed to retrieve contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'contacts:write');
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ContactCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid contact payload' },
        { status: 400 }
      );
    }

    const { phoneNumber, firstName, lastName, email, customAttributes, tags, groupIds } = parsed.data;
    const phoneResult = sanitizePhoneNumber(phoneNumber);
    if (!phoneResult.isValid) {
      return NextResponse.json({ error: 'Invalid E.164 phone number format' }, { status: 400 });
    }

    const contact = await prisma.contact.upsert({
      where: { phoneNumber: phoneResult.e164 },
      update: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        email: email !== undefined ? email : undefined,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : undefined,
      },
      create: {
        phoneNumber: phoneResult.e164,
        firstName,
        lastName,
        email,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : null,
      },
    });

    // Assign tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName.trim() },
          update: {},
          create: { name: tagName.trim() },
        });

        await prisma.contactsOnTags.upsert({
          where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
          update: {},
          create: { contactId: contact.id, tagId: tag.id },
        }).catch(() => {});
      }
    }

    // Assign groups
    if (groupIds && groupIds.length > 0) {
      for (const groupId of groupIds) {
        await prisma.contactsOnGroups.upsert({
          where: { contactId_groupId: { contactId: contact.id, groupId } },
          update: {},
          create: { contactId: contact.id, groupId },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 contact create');
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
