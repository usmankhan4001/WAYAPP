import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isModuleEnabled } from '@/lib/modules';
import { logger } from '@/lib/logger';

const DEFAULT_SNIPPETS = [
  {
    shortcut: '/pricing',
    title: 'Pricing & Standard Packages',
    content: 'Hi! Our standard plans start at $29/mo with 0% markup on official WhatsApp message rates. All plans include shared inbox, CRM tags, and unlimited contacts. Would you like our detailed package breakdown? 📊',
    category: 'PRICING',
  },
  {
    shortcut: '/brochure',
    title: 'Product Catalog & PDF Brochure',
    content: 'Here is our complete catalog and solutions brochure: https://gccstartup.com/brochure.pdf 📄 Let me know if you would like me to explain any specific feature!',
    category: 'GENERAL',
  },
  {
    shortcut: '/demo',
    title: 'Book a 1-on-1 Consultation Demo',
    content: 'We would love to show you a live interactive walkthrough! You can pick a convenient 15-minute slot on our calendar here: https://calendly.com/gccstartup/demo 📅',
    category: 'CLOSING',
  },
  {
    shortcut: '/discount',
    title: 'Limited-Time Seasonal Offer',
    content: 'Great news! We are currently running an exclusive 20% discount on all annual enterprise plans. Use coupon code WAYAPP20 upon signup! 🎁',
    category: 'PRICING',
  },
  {
    shortcut: '/location',
    title: 'Office Address & Working Hours',
    content: '📍 Our head office is located at Downtown Commercial Tower, Level 14, Dubai, UAE. We are open Monday to Friday, 9:00 AM – 6:00 PM GST.',
    category: 'SUPPORT',
  },
  {
    shortcut: '/bank-details',
    title: 'Direct Wire / Bank Transfer Info',
    content: 'Bank: Emirates NBD\nAccount Title: GCC Startup FZ-LLC\nIBAN: AE070260000123456789012\nCurrency: AED / USD\nPlease share payment proof once transferred so we can activate your account immediately! 💳',
    category: 'PRICING',
  },
];

export async function GET(request: NextRequest) {
  try {
    const enabled = await isModuleEnabled('canned_snippets');
    if (!enabled) {
      return NextResponse.json({ snippets: [] });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    let list = await prisma.cannedSnippet.findMany({
      orderBy: [{ usageCount: 'desc' }, { shortcut: 'asc' }],
    });

    if (list.length === 0) {
      for (const item of DEFAULT_SNIPPETS) {
        await prisma.cannedSnippet.create({ data: item }).catch(() => {});
      }
      list = await prisma.cannedSnippet.findMany({
        orderBy: [{ usageCount: 'desc' }, { shortcut: 'asc' }],
      });
    }

    if (query) {
      list = list.filter(
        (s) =>
          s.shortcut.toLowerCase().includes(query) ||
          s.title.toLowerCase().includes(query) ||
          s.content.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ snippets: list });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch canned snippets');
    return NextResponse.json({ error: 'Failed to fetch snippets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortcut, title, content, category = 'GENERAL', action } = body;

    // Increment usage count
    if (action === 'use' && body.id) {
      await prisma.cannedSnippet.update({
        where: { id: body.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (!shortcut || !title || !content) {
      return NextResponse.json({ error: 'shortcut, title, and content are required' }, { status: 400 });
    }

    const cleanShortcut = shortcut.startsWith('/') ? shortcut.trim() : `/${shortcut.trim()}`;

    const snippet = await prisma.cannedSnippet.upsert({
      where: { shortcut: cleanShortcut },
      update: { title, content, category },
      create: { shortcut: cleanShortcut, title, content, category },
    });

    return NextResponse.json({ success: true, snippet });
  } catch (error: any) {
    logger.error({ error }, 'Failed to save canned snippet');
    return NextResponse.json({ error: error.message || 'Failed to save snippet' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing snippet ID' }, { status: 400 });

    await prisma.cannedSnippet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete snippet' }, { status: 500 });
  }
}
