import { prisma } from '@/lib/prisma';

export interface EligibilityResult {
  allowed: boolean;
  reason?:
    | 'OPTED_OUT'
    | 'SUPPRESSED'
    | 'CONTACT_NOT_ACTIVE'
    | 'TEMPLATE_NOT_MARKETING'
    | 'TEMPLATE_NOT_APPROVED'
    | 'ACTIVE_HUMAN_HANDOFF'
    | 'OK';
  details?: string;
}

export interface CheckMarketingEligibilityParams {
  contactId: string;
  phoneNumber: string;
  templateCategory?: string;
  templateStatus?: string;
  checkHandoff?: boolean;
}

/**
 * Evaluates whether a contact is eligible to receive an outbound marketing message
 */
export async function checkMarketingEligibility(
  params: CheckMarketingEligibilityParams
): Promise<EligibilityResult> {
  const { contactId, templateCategory, templateStatus, checkHandoff = false } = params;

  // 1. Check Contact Status
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { status: true, optedOutAt: true },
  });

  if (!contact || contact.status === 'UNSUBSCRIBED' || contact.optedOutAt) {
    return {
      allowed: false,
      reason: 'OPTED_OUT',
      details: 'Contact has opted out or is marked as unsubscribed.',
    };
  }

  if (contact.status === 'BLOCKED' || contact.status === 'BOUNCED') {
    return {
      allowed: false,
      reason: 'CONTACT_NOT_ACTIVE',
      details: `Contact is currently in ${contact.status} status.`,
    };
  }

  // 2. Check Suppression List
  const suppression = await prisma.contactSuppression.findFirst({
    where: {
      contactId,
      type: { in: ['MARKETING_OPT_OUT', 'GLOBAL_SUPPRESSION', 'MANUAL_SUPPRESSION'] },
    },
  });

  if (suppression) {
    return {
      allowed: false,
      reason: 'SUPPRESSED',
      details: `Contact is on the suppression list: ${suppression.type} (${suppression.reason || 'No reason provided'}).`,
    };
  }

  // 3. Check Template Requirements
  if (templateCategory && templateCategory.toUpperCase() !== 'MARKETING') {
    return {
      allowed: false,
      reason: 'TEMPLATE_NOT_MARKETING',
      details: `Template category is ${templateCategory}, not MARKETING.`,
    };
  }

  if (templateStatus && templateStatus.toUpperCase() !== 'APPROVED') {
    return {
      allowed: false,
      reason: 'TEMPLATE_NOT_APPROVED',
      details: `Template status is ${templateStatus}, must be APPROVED by Meta.`,
    };
  }

  // 4. Check Active Human Handoff (optional guardrail)
  if (checkHandoff) {
    const activeSession = await prisma.conversationSession.findFirst({
      where: {
        contactId,
        status: 'ACTIVE',
      },
    });

    const openConversation = await prisma.conversation.findUnique({
      where: { contactId },
      select: { status: true, assignedToId: true },
    });

    if (openConversation?.assignedToId && openConversation.status === 'OPEN') {
      return {
        allowed: false,
        reason: 'ACTIVE_HUMAN_HANDOFF',
        details: 'Contact is currently in active conversation with a live human advisor.',
      };
    }
  }

  return {
    allowed: true,
    reason: 'OK',
  };
}
