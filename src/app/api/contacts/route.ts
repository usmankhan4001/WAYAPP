import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/utils';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const groupId = searchParams.get('groupId');
    const tagId = searchParams.get('tagId');
    const status = searchParams.get('status');

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phoneNumber: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (groupId) {
      whereClause.groups = {
        some: { groupId },
      };
    }

    if (tagId) {
      whereClause.tags = {
        some: { tagId },
      };
    }

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        groups: {
          include: {
            group: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      groupIds = [],
      tagIds = [],
      customAttributes = {},
      status = 'ACTIVE',
    } = body;

    if (!phoneNumber?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const normalizedPhone = normalizePhoneNumber(phoneNumber, settings?.defaultCountryCode || '+1');

    // Only update fields the client explicitly sent — partial updates must not
    // wipe existing name/email/attributes/group/tag assignments
    const hasField = (key: string) => body[key] !== undefined;
    const updateData: any = {};

    if (hasField('firstName')) updateData.firstName = firstName?.trim() || null;
    if (hasField('lastName')) updateData.lastName = lastName?.trim() || null;
    if (hasField('email')) updateData.email = email?.trim() || null;
    if (hasField('status')) updateData.status = status;
    if (hasField('customAttributes')) {
      updateData.customAttributes = JSON.stringify(customAttributes);
    }
    if (hasField('groupIds') && Array.isArray(groupIds)) {
      updateData.groups = {
        deleteMany: {},
        create: groupIds.map((gId: string) => ({ groupId: gId })),
      };
    }
    if (hasField('tagIds') && Array.isArray(tagIds)) {
      updateData.tags = {
        deleteMany: {},
        create: tagIds.map((tId: string) => ({ tagId: tId })),
      };
    }

    const contact = await prisma.contact.upsert({
      where: { phoneNumber: normalizedPhone },
      update: updateData,
      create: {
        phoneNumber: normalizedPhone,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        status,
        customAttributes: JSON.stringify(customAttributes),
        groups: {
          create: groupIds.map((gId: string) => ({ groupId: gId })),
        },
        tags: {
          create: tagIds.map((tId: string) => ({ tagId: tId })),
        },
      },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
