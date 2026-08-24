import { NextRequest, NextResponse } from 'next/server';
import { getTargetContacts } from '@/worker/dispatcher';
import { requireAuth } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { audienceFilter } = body;

    const filterString = typeof audienceFilter === 'string' ? audienceFilter : JSON.stringify(audienceFilter || {});
    const matchingContacts = await getTargetContacts(filterString);

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
