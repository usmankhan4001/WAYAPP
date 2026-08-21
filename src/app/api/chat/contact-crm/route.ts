import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        tags: { include: { tag: true } },
        groups: { include: { group: true } },
        conversation: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true, role: true } },
            notes: {
              include: { author: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' },
            },
            events: {
              include: { actor: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get all available tags and agents for dropdowns
    const allTags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const allAgents = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      contact,
      allTags,
      allAgents,
      leadStages: [
        { id: 'NEW_LEAD', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
        { id: 'CONTACTED', label: 'Contacted', color: 'bg-amber-100 text-amber-800' },
        { id: 'QUALIFIED', label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
        { id: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800' },
        { id: 'WON', label: 'Deal Won', color: 'bg-emerald-100 text-emerald-800' },
        { id: 'LOST', label: 'Deal Lost', color: 'bg-rose-100 text-rose-800' },
      ],
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch contact CRM details');
    return NextResponse.json({ error: 'Failed to fetch contact CRM' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, leadStage, dealValue, company, city, tagIds, noteText, authorId, assignToId } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (leadStage !== undefined) updateData.leadStage = leadStage;
    if (dealValue !== undefined) updateData.dealValue = parseFloat(dealValue) || 0;
    if (company !== undefined) updateData.company = company;
    if (city !== undefined) updateData.city = city;

    // Update Contact Details
    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    // Update Tags if provided
    if (Array.isArray(tagIds)) {
      await prisma.contactsOnTags.deleteMany({ where: { contactId } });
      if (tagIds.length > 0) {
        await prisma.contactsOnTags.createMany({
          data: tagIds.map((tagId: string) => ({ contactId, tagId })),
        });
      }
    }

    // Handle Conversation notes and assignment
    let conversation = await prisma.conversation.findUnique({
      where: { contactId },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { contactId, status: 'OPEN' },
      });
    }

    if (assignToId !== undefined) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { assignedToId: assignToId || null },
      });

      await prisma.conversationEvent.create({
        data: {
          conversationId: conversation.id,
          type: assignToId ? 'ASSIGNED' : 'UNASSIGNED',
          actorId: authorId || null,
          payload: JSON.stringify({ assignedToId: assignToId }),
        },
      }).catch(() => {});
    }

    // Add Note if provided
    if (noteText && noteText.trim()) {
      let author = authorId ? await prisma.user.findUnique({ where: { id: authorId } }) : null;
      if (!author) {
        author = await prisma.user.findFirst();
      }

      if (author) {
        await prisma.conversationNote.create({
          data: {
            conversationId: conversation.id,
            authorId: author.id,
            body: noteText.trim(),
          },
        });

        await prisma.conversationEvent.create({
          data: {
            conversationId: conversation.id,
            type: 'NOTE_ADDED',
            actorId: author.id,
            payload: JSON.stringify({ snippet: noteText.trim().substring(0, 50) }),
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, contact: updatedContact });
  } catch (error: any) {
    logger.error({ error }, 'Failed to update contact CRM');
    return NextResponse.json({ error: error.message || 'Failed to update contact CRM' }, { status: 500 });
  }
}
