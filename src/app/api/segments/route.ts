import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(segments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, rulesJson } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Segment name is required' }, { status: 400 });
    }

    const segment = await prisma.segment.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        rulesJson: typeof rulesJson === 'string' ? rulesJson : JSON.stringify(rulesJson || {}),
      },
    });

    return NextResponse.json({ success: true, segment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }

    await prisma.segment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
