import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const automations = await prisma.automation.findMany({
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalExecutions = automations.reduce((acc, a) => acc + a.executionCount, 0);

    return NextResponse.json({
      automations,
      stats: {
        totalRules: automations.length,
        activeRules: automations.filter((a) => a.isActive).length,
        totalExecutions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const body = await request.json();
    const { name, description, triggerType, triggerConfig, actionsJson, isActive } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: 'Name and triggerType are required' }, { status: 400 });
    }

    const automation = await prisma.automation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        triggerType: triggerType || 'KEYWORD_MATCH',
        triggerConfig: typeof triggerConfig === 'string' ? triggerConfig : JSON.stringify(triggerConfig || {}),
        actionsJson: typeof actionsJson === 'string' ? actionsJson : JSON.stringify(actionsJson || []),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, automation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
