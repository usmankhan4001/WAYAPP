import { NextRequest, NextResponse } from 'next/server';
import { getAllAppModules, setModuleEnabled, REGISTERED_MODULES } from '@/lib/modules';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const modules = await getAllAppModules();
    return NextResponse.json({
      modules,
      categories: [
        { id: 'ALL', label: 'All Modules' },
        { id: 'SALES_AI', label: 'Sales & AI Co-Pilot' },
        { id: 'SALES_TOOLS', label: 'Sales Tools & CRM' },
        { id: 'ENGAGEMENT', label: 'Engagement & Campaigns' },
        { id: 'AUTOMATION', label: 'Flows & Bots' },
        { id: 'CHANNELS', label: 'Social Channels' },
        { id: 'INTEGRATIONS', label: 'E-Commerce & Apps' },
        { id: 'DEVELOPER', label: 'Developer & Webhooks' },
      ],
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to fetch modules');
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleId, isEnabled } = body;

    if (!moduleId || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'moduleId and isEnabled (boolean) are required' }, { status: 400 });
    }

    const updated = await setModuleEnabled(moduleId, isEnabled);
    return NextResponse.json({ success: true, module: updated });
  } catch (error: any) {
    logger.error({ error }, 'Failed to update module state');
    return NextResponse.json({ error: 'Failed to update module state' }, { status: 500 });
  }
}
