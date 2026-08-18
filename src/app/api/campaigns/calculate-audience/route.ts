import { NextRequest, NextResponse } from 'next/server';
import { CampaignDispatcher } from '@/lib/whatsapp/queue';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audienceFilter } = body;

    const filterString = typeof audienceFilter === 'string' ? audienceFilter : JSON.stringify(audienceFilter || {});
    const matchingContacts = await CampaignDispatcher.getTargetContacts(filterString);

    // Return count and first 5 sample recipients for preview
    const sampleContacts = matchingContacts.slice(0, 5).map((c) => ({
      id: c.id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer',
      phone: c.phoneNumber,
      email: c.email,
    }));

    return NextResponse.json({
      count: matchingContacts.length,
      sampleContacts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
