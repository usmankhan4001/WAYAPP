import { NextRequest, NextResponse } from 'next/server';
import { getTargetContacts, consentRequiredForMarketing } from '@/worker/dispatcher';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { audienceFilter, templateId } = body;

    const filterString = typeof audienceFilter === 'string' ? audienceFilter : JSON.stringify(audienceFilter || {});
    // Mirror the dispatcher exactly: same resolver, same consent rule.
    let requireConsent = false;
    if (templateId && consentRequiredForMarketing()) {
      const tpl = await prisma.template.findUnique({ where: { id: templateId }, select: { category: true } });
      requireConsent = tpl?.category === 'MARKETING';
    }
    const matchingContacts = await getTargetContacts(filterString, { requireConsent });
    const noConsentCount = matchingContacts.filter((c) => !c.consentSource).length;

    // Return count and first 5 sample recipients for preview
    const sampleContacts = matchingContacts.slice(0, 5).map((c) => ({
      id: c.id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer',
      phone: c.phoneNumber,
      email: c.email,
    }));

    return NextResponse.json({
      count: matchingContacts.length,
      noConsentCount,
      sampleContacts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
