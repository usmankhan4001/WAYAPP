import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/utils';
import { requireAuth, requireRole } from '@/lib/auth/rbac';

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
    const normalizedPhone = normalizePhoneNumber(phoneNumber, settings?.defaultCountryCode || '+971');

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

    const contactId = body.id;

    if (contactId) {
      // Direct update by contactId
      const updatePayload: any = {
        phoneNumber: normalizedPhone,
        ...updateData,
      };

      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: updatePayload,
        include: {
          groups: { include: { group: true } },
          tags: { include: { tag: true } },
        },
      });

      return NextResponse.json({ success: true, contact });
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

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const {
      ids = [],
      id,
      status,
      addGroupId,
      removeGroupId,
      addTagId,
      removeTagId,
      customAttributes,
    } = body;

    const targetIds: string[] = id ? [id] : Array.isArray(ids) ? ids : [];
    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Target contact ID or IDs required' }, { status: 400 });
    }

    // 1. Bulk Status Change
    if (status) {
      await prisma.contact.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status,
          ...(status === 'UNSUBSCRIBED' ? { optedOutAt: new Date() } : {}),
        },
      });
    }

    // 2. Bulk Add Group
    if (addGroupId) {
      for (const cId of targetIds) {
        await prisma.contactsOnGroups.upsert({
          where: { contactId_groupId: { contactId: cId, groupId: addGroupId } },
          update: {},
          create: { contactId: cId, groupId: addGroupId },
        }).catch(() => {});
      }
    }

    // 3. Bulk Remove Group
    if (removeGroupId) {
      await prisma.contactsOnGroups.deleteMany({
        where: { contactId: { in: targetIds }, groupId: removeGroupId },
      });
    }

    // 4. Bulk Add Tag
    if (addTagId) {
      for (const cId of targetIds) {
        await prisma.contactsOnTags.upsert({
          where: { contactId_tagId: { contactId: cId, tagId: addTagId } },
          update: {},
          create: { contactId: cId, tagId: addTagId },
        }).catch(() => {});
      }
    }

    // 5. Bulk Remove Tag
    if (removeTagId) {
      await prisma.contactsOnTags.deleteMany({
        where: { contactId: { in: targetIds }, tagId: removeTagId },
      });
    }

    // 6. Custom Attributes Update
    if (customAttributes && typeof customAttributes === 'object') {
      for (const cId of targetIds) {
        const existing = await prisma.contact.findUnique({
          where: { id: cId },
          select: { customAttributes: true },
        });
        let existingAttrs: any = {};
        try {
          if (existing?.customAttributes) existingAttrs = JSON.parse(existing.customAttributes);
        } catch {}
        const merged = { ...existingAttrs, ...customAttributes };
        await prisma.contact.update({
          where: { id: cId },
          data: { customAttributes: JSON.stringify(merged) },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, count: targetIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Contact deletion is destructive and irreversible; it is ADMIN-only. Bare
  // requireAuth previously allowed any MEMBER/VIEWER to wipe CRM contacts.
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let idsToDelete: string[] = [];
    if (id) {
      idsToDelete.push(id);
    } else if (idsParam) {
      idsToDelete = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids;
        } else if (body?.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Contact ID or IDs are required' }, { status: 400 });
    }

    const result = await prisma.contact.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
