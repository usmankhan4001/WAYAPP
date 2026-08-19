import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from './client';
import { InboundConversationEvent } from './types';
import { logger } from '@/lib/logger';

export interface FlowStepOption {
  id: string;
  title: string;
  description?: string;
  score?: number;
  tag?: string;
}

export interface FlowStep {
  id: string;
  type: 'LIST' | 'BUTTONS' | 'TEXT';
  saveAs: string; // e.g. "businessType", "country", "goal", "timeline"
  prompt: string;
  header?: string;
  footer?: string;
  buttonText?: string;
  options?: FlowStepOption[];
  nextStepId?: string;
}

export interface FlowDefinition {
  slug: string;
  name: string;
  description?: string;
  startTrigger: {
    quickReplyId?: string;
    keywords?: string[];
    templateName?: string;
  };
  steps: FlowStep[];
  completion: {
    messageText: string;
    addTags?: string[];
    assignLeadScore?: boolean;
    pauseAutomation?: boolean;
    conversionEventName?: string;
  };
}

/**
 * Built-in GCCStartup Lead Qualification Flow Definition
 */
export const GCC_STARTUP_FLOW: FlowDefinition = {
  slug: 'gcc_startup_qualification',
  name: 'GCCStartup Lead Qualification',
  description: '4-step qualification funnel for Dubai/UAE company formation & banking leads',
  startTrigger: {
    quickReplyId: 'start_qualification',
    keywords: ['start_qualification', 'apply', 'register', 'qualify', 'gcc', 'gccstartup', 'start qualification'],
    templateName: 'gcc_initial_qualification',
  },
  steps: [
    {
      id: 'business_type',
      type: 'LIST',
      saveAs: 'businessType',
      prompt: 'What is your business activity?',
      buttonText: 'Select Activity',
      options: [
        {
          id: 'business_ecommerce',
          title: 'E-commerce',
          description: 'Online stores, dropshipping, D2C brands',
          tag: 'E-commerce',
          score: 15,
        },
        {
          id: 'business_consulting_agency',
          title: 'Consulting / Agency',
          description: 'Marketing, tech, management consulting',
          tag: 'Consulting/Agency',
          score: 15,
        },
        {
          id: 'business_saas_it',
          title: 'SaaS / IT Services',
          description: 'Software, web development, IT solutions',
          tag: 'SaaS/IT',
          score: 15,
        },
        {
          id: 'business_trading_general',
          title: 'Trading / Real Estate',
          description: 'Import/export, real estate, holding companies',
          tag: 'Trading/Real Estate',
          score: 10,
        },
        {
          id: 'business_other',
          title: 'Other Activities',
          description: 'Healthcare, logistics, professional services',
          tag: 'Other Activity',
          score: 5,
        },
      ],
    },
    {
      id: 'country',
      type: 'LIST',
      saveAs: 'country',
      prompt: 'Great! Where are you currently living / tax resident?',
      buttonText: 'Select Country',
      options: [
        { id: 'country_netherlands', title: 'Netherlands', tag: 'Netherlands', score: 15 },
        { id: 'country_germany', title: 'Germany', tag: 'Germany', score: 15 },
        { id: 'country_uk', title: 'United Kingdom', tag: 'UK', score: 15 },
        { id: 'country_france', title: 'France', tag: 'France', score: 15 },
        { id: 'country_usa_canada', title: 'USA / Canada', tag: 'North America', score: 10 },
        { id: 'country_other', title: 'Other Country', tag: 'Other Country', score: 10 },
      ],
    },
    {
      id: 'goal',
      type: 'LIST',
      saveAs: 'goal',
      prompt: 'What is your primary goal for expanding to Dubai / UAE?',
      buttonText: 'Select Goal',
      options: [
        {
          id: 'goal_company_bank',
          title: 'Company + Bank Account',
          description: 'Full UAE setup with corporate bank account',
          tag: 'Company + Bank',
          score: 20,
        },
        {
          id: 'goal_tax_optimization',
          title: 'Tax Optimization',
          description: '0% personal & corporate tax residency',
          tag: 'Tax Optimization',
          score: 15,
        },
        {
          id: 'goal_nominee_ubo',
          title: 'Nominee / Privacy Setup',
          description: 'Confidentiality & asset protection structure',
          tag: 'Nominee Setup',
          score: 15,
        },
        {
          id: 'goal_company_reg',
          title: 'Company Reg Only',
          description: 'Fast incorporation license',
          tag: 'Company Reg',
          score: 10,
        },
        {
          id: 'goal_other',
          title: 'Other / Custom Advisory',
          description: 'Custom advisory & visa assistance',
          tag: 'General Inquiry',
          score: 5,
        },
      ],
    },
    {
      id: 'timeline',
      type: 'LIST',
      saveAs: 'timeline',
      prompt: 'When are you looking to get started?',
      buttonText: 'Select Timeline',
      options: [
        {
          id: 'timeline_immediately',
          title: 'Immediately',
          description: 'Ready to start right now',
          tag: 'Immediate Lead',
          score: 30,
        },
        {
          id: 'timeline_one_month',
          title: 'Within 1 Month',
          description: 'Planning in the next 30 days',
          tag: '1 Month Lead',
          score: 20,
        },
        {
          id: 'timeline_three_months',
          title: 'Within 3 Months',
          description: 'Exploring for next quarter',
          tag: '3 Months Lead',
          score: 10,
        },
        {
          id: 'timeline_exploring',
          title: 'Just Exploring',
          description: 'Researching options for now',
          tag: 'Exploring Lead',
          score: 0,
        },
      ],
    },
  ],
  completion: {
    messageText:
      '🎉 Thank you for sharing your details!\n\nOur senior UAE corporate structuring advisor has received your qualification profile and will reach out to you shortly right here on WhatsApp to assist with your setup.',
    addTags: ['GCC Qualified'],
    assignLeadScore: true,
    pauseAutomation: true,
    conversionEventName: 'QualifiedLead',
  },
};

/**
 * Ensures the default GCC Startup Flow is registered in the database
 */
export async function ensureDefaultFlows(): Promise<void> {
  try {
    const existing = await prisma.conversationFlow.findUnique({
      where: { slug: GCC_STARTUP_FLOW.slug },
    });

    if (!existing) {
      await prisma.conversationFlow.create({
        data: {
          slug: GCC_STARTUP_FLOW.slug,
          name: GCC_STARTUP_FLOW.name,
          description: GCC_STARTUP_FLOW.description,
          definition: JSON.stringify(GCC_STARTUP_FLOW),
          isActive: true,
        },
      });
      logger.info('GCCStartup Qualification Flow registered in database');
    }
  } catch (err) {
    logger.error({ err }, 'Error ensuring default conversation flows');
  }
}

/**
 * Send the interactive message corresponding to a flow step
 */
export async function sendStepMessage(
  client: WhatsAppClient,
  phoneNumber: string,
  contactId: string,
  step: FlowStep
): Promise<void> {
  if (step.type === 'LIST' && step.options && step.options.length > 0) {
    const rows = step.options.map((opt) => ({
      id: opt.id,
      title: opt.title,
      description: opt.description,
    }));

    const result = await client.sendListMessage({
      to: phoneNumber,
      body: step.prompt,
      buttonText: step.buttonText || 'Choose Option',
      sections: [
        {
          title: step.header || 'Options',
          rows,
        },
      ],
      header: step.header,
      footer: step.footer,
    });

    const wamid = result.messages?.[0]?.id || `step_${Date.now()}`;
    await prisma.chatMessage.create({
      data: {
        contactId,
        phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: 'interactive',
        body: `[List Question]: ${step.prompt}`,
        status: 'SENT',
      },
    }).catch(() => {});
  } else if (step.type === 'BUTTONS' && step.options && step.options.length > 0) {
    const buttons = step.options.slice(0, 3).map((opt) => ({
      id: opt.id,
      title: opt.title,
    }));

    const result = await client.sendReplyButtons({
      to: phoneNumber,
      body: step.prompt,
      buttons,
      header: step.header,
      footer: step.footer,
    });

    const wamid = result.messages?.[0]?.id || `step_${Date.now()}`;
    await prisma.chatMessage.create({
      data: {
        contactId,
        phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: 'interactive',
        body: `[Buttons Question]: ${step.prompt}`,
        status: 'SENT',
      },
    }).catch(() => {});
  } else {
    // TEXT prompt
    const result = await client.sendTextMessage(phoneNumber, step.prompt);
    const wamid = result.messages?.[0]?.id || `step_${Date.now()}`;
    await prisma.chatMessage.create({
      data: {
        contactId,
        phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: 'text',
        body: step.prompt,
        status: 'SENT',
      },
    }).catch(() => {});
  }
}

/**
 * Calculates lead temperature and score from collected attributes
 */
export function calculateLeadScore(data: Record<string, any>): {
  leadScore: number;
  leadTemperature: 'HOT' | 'WARM' | 'COLD';
} {
  let score = 0;

  // Timeline weights
  const timeline = String(data.timeline || '').toLowerCase();
  if (timeline.includes('immediately') || timeline.includes('immediate')) score += 30;
  else if (timeline.includes('1 month') || timeline.includes('month')) score += 20;
  else if (timeline.includes('3 month') || timeline.includes('quarter')) score += 10;
  else score += 0;

  // Goal weights
  const goal = String(data.goal || '').toLowerCase();
  if (goal.includes('bank') || goal.includes('company + bank')) score += 20;
  else if (goal.includes('tax')) score += 15;
  else if (goal.includes('nominee') || goal.includes('privacy')) score += 15;
  else if (goal.includes('company') || goal.includes('reg')) score += 10;
  else score += 5;

  // Business Type weights
  const business = String(data.businessType || '').toLowerCase();
  if (business.includes('ecommerce') || business.includes('e-commerce')) score += 15;
  else if (business.includes('consulting') || business.includes('agency')) score += 15;
  else if (business.includes('saas') || business.includes('it')) score += 15;
  else if (business.includes('trading') || business.includes('real estate')) score += 10;
  else score += 5;

  // Country weights
  const country = String(data.country || '').toLowerCase();
  if (['netherlands', 'germany', 'uk', 'france', 'united kingdom'].some((c) => country.includes(c))) {
    score += 15;
  } else {
    score += 10;
  }

  // Bonus: explicit score overrides in data
  if (typeof data._accumulatedScore === 'number') {
    score = Math.max(score, data._accumulatedScore);
  }

  let leadTemperature: 'HOT' | 'WARM' | 'COLD' = 'COLD';
  if (score >= 70) leadTemperature = 'HOT';
  else if (score >= 40) leadTemperature = 'WARM';

  return { leadScore: Math.min(100, score), leadTemperature };
}

/**
 * Main Conversation Flow Engine: Evaluates inbound events against active sessions or start triggers
 */
export async function processConversationEvent(event: InboundConversationEvent): Promise<boolean> {
  const { contactId, phoneNumber, bodyText, interactiveId, interactiveTitle, buttonPayload } = event;
  const client = await WhatsAppClient.createFromSettings();

  try {
    // 1. Check for active ConversationSession for this contact
    const activeSession = await prisma.conversationSession.findFirst({
      where: {
        contactId,
        status: 'ACTIVE',
      },
      include: {
        flow: true,
        contact: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeSession) {
      let flowDef: FlowDefinition;
      try {
        flowDef = JSON.parse(activeSession.flow.definition);
      } catch {
        flowDef = GCC_STARTUP_FLOW;
      }

      const currentStepIndex = flowDef.steps.findIndex((s) => s.id === activeSession.currentStep);
      const currentStep = flowDef.steps[currentStepIndex];

      if (!currentStep) {
        // Unknown step, close session
        await prisma.conversationSession.update({
          where: { id: activeSession.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        return false;
      }

      // Match user selection against current step options
      let matchedOption: FlowStepOption | undefined;
      const normalizedInput = (bodyText || '').trim().toLowerCase();
      const inputId = (interactiveId || buttonPayload || '').trim().toLowerCase();

      if (currentStep.options && currentStep.options.length > 0) {
        matchedOption = currentStep.options.find(
          (opt) =>
            (inputId && opt.id.toLowerCase() === inputId) ||
            opt.title.toLowerCase() === normalizedInput ||
            opt.id.toLowerCase() === normalizedInput ||
            (interactiveTitle && opt.title.toLowerCase() === interactiveTitle.toLowerCase())
        );

        // If not matched, try substring match on titles
        if (!matchedOption && normalizedInput) {
          matchedOption = currentStep.options.find((opt) =>
            normalizedInput.includes(opt.title.toLowerCase())
          );
        }
      }

      let answerValue = matchedOption ? matchedOption.title : bodyText.trim();
      if (!matchedOption && currentStep.type !== 'TEXT') {
        // Could not resolve selection for LIST / BUTTONS prompt: Re-send prompt politely
        await sendStepMessage(client, phoneNumber, contactId, currentStep);
        return true;
      }

      // Save answer in session dataJson
      let sessionData: Record<string, any> = {};
      try {
        sessionData = JSON.parse(activeSession.dataJson || '{}');
      } catch {}

      sessionData[currentStep.saveAs] = answerValue;
      if (matchedOption?.score) {
        sessionData._accumulatedScore = (sessionData._accumulatedScore || 0) + matchedOption.score;
      }
      if (matchedOption?.tag) {
        sessionData._tags = sessionData._tags || [];
        sessionData._tags.push(matchedOption.tag);
      }

      // Determine next step
      const nextStepIndex = currentStepIndex + 1;
      const hasNextStep = nextStepIndex < flowDef.steps.length;

      if (hasNextStep) {
        const nextStep = flowDef.steps[nextStepIndex];

        // Advance session
        await prisma.conversationSession.update({
          where: { id: activeSession.id },
          data: {
            currentStep: nextStep.id,
            dataJson: JSON.stringify(sessionData),
            updatedAt: new Date(),
          },
        });

        // Send next step interactive message
        await sendStepMessage(client, phoneNumber, contactId, nextStep);
        return true;
      } else {
        // FLOW COMPLETION!
        const { leadScore, leadTemperature } = calculateLeadScore(sessionData);
        sessionData.leadScore = leadScore;
        sessionData.leadTemperature = leadTemperature;
        sessionData.qualifiedAt = new Date().toISOString();

        // Update session
        await prisma.conversationSession.update({
          where: { id: activeSession.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            dataJson: JSON.stringify(sessionData),
          },
        });

        // Merge into Contact.customAttributes
        let existingAttributes: Record<string, any> = {};
        try {
          existingAttributes = JSON.parse(activeSession.contact.customAttributes || '{}');
        } catch {}

        const mergedAttributes = {
          ...existingAttributes,
          ...sessionData,
          businessType: sessionData.businessType || existingAttributes.businessType,
          country: sessionData.country || existingAttributes.country,
          goal: sessionData.goal || existingAttributes.goal,
          timeline: sessionData.timeline || existingAttributes.timeline,
          leadScore,
          leadTemperature,
          qualificationStatus: 'COMPLETED',
          lastQualifiedAt: new Date().toISOString(),
        };

        await prisma.contact.update({
          where: { id: contactId },
          data: {
            customAttributes: JSON.stringify(mergedAttributes),
          },
        });

        // Assign completion tags
        const tagsToApply = new Set<string>();
        if (flowDef.completion.addTags) {
          flowDef.completion.addTags.forEach((t) => tagsToApply.add(t));
        }
        if (Array.isArray(sessionData._tags)) {
          sessionData._tags.forEach((t: string) => tagsToApply.add(t));
        }
        if (leadTemperature === 'HOT') tagsToApply.add('HOT Lead 🔥');
        else if (leadTemperature === 'WARM') tagsToApply.add('WARM Lead 🟡');

        for (const tagName of tagsToApply) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName, color: tagName.includes('HOT') ? '#ef4444' : '#10b981' },
          });

          await prisma.contactsOnTags.upsert({
            where: { contactId_tagId: { contactId, tagId: tag.id } },
            update: {},
            create: { contactId, tagId: tag.id },
          }).catch(() => {});
        }

        // Send completion confirmation message
        if (flowDef.completion.messageText) {
          const sendRes = await client.sendTextMessage(phoneNumber, flowDef.completion.messageText);
          const completionWamid = sendRes.messages?.[0]?.id || `complete_${Date.now()}`;
          await prisma.chatMessage.create({
            data: {
              contactId,
              phoneNumber,
              direction: 'OUTBOUND',
              wamid: completionWamid,
              messageType: 'text',
              body: flowDef.completion.messageText,
              status: 'SENT',
            },
          }).catch(() => {});
        }

        // Log Conversion Event
        const eventName = flowDef.completion.conversionEventName || 'QualifiedLead';
        await prisma.conversionEvent.create({
          data: {
            contactId,
            eventName,
            value: leadScore,
            currency: 'USD',
            metadata: JSON.stringify({
              leadTemperature,
              businessType: sessionData.businessType,
              country: sessionData.country,
              goal: sessionData.goal,
              timeline: sessionData.timeline,
            }),
          },
        }).catch(() => {});

        // Mark Conversation OPEN for human agent handoff
        await prisma.conversation.upsert({
          where: { contactId },
          update: {
            status: 'OPEN',
            unreadCount: { increment: 1 },
            lastMessageAt: new Date(),
          },
          create: {
            contactId,
            status: 'OPEN',
            unreadCount: 1,
            lastMessageAt: new Date(),
          },
        });

        logger.info(
          { contactId, phoneNumber, leadScore, leadTemperature },
          '[ConversationEngine] GCC Lead Qualification Flow Completed successfully!'
        );

        return true;
      }
    }

    // 2. Check if inbound event triggers a new ConversationFlow
    await ensureDefaultFlows();

    const activeFlows = await prisma.conversationFlow.findMany({
      where: { isActive: true },
    });

    const normalizedInput = (bodyText || '').trim().toLowerCase();
    const candidateId = (interactiveId || buttonPayload || '').trim().toLowerCase();

    for (const flow of activeFlows) {
      let flowDef: FlowDefinition;
      try {
        flowDef = JSON.parse(flow.definition);
      } catch {
        continue;
      }

      let matches = false;

      // Match Quick Reply ID
      if (
        flowDef.startTrigger.quickReplyId &&
        candidateId &&
        candidateId === flowDef.startTrigger.quickReplyId.toLowerCase()
      ) {
        matches = true;
      }

      // Match Keywords
      if (!matches && flowDef.startTrigger.keywords && flowDef.startTrigger.keywords.length > 0) {
        matches = flowDef.startTrigger.keywords.some((kw) => {
          const cleanKw = kw.toLowerCase().trim();
          return (
            normalizedInput === cleanKw ||
            candidateId === cleanKw ||
            normalizedInput.startsWith(cleanKw) ||
            normalizedInput.includes(cleanKw)
          );
        });
      }

      if (matches) {
        const firstStep = flowDef.steps[0];
        if (!firstStep) continue;

        // Cancel any old active sessions for this contact
        await prisma.conversationSession.updateMany({
          where: { contactId, status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        });

        // Create new active ConversationSession
        const session = await prisma.conversationSession.create({
          data: {
            contactId,
            flowId: flow.id,
            currentStep: firstStep.id,
            status: 'ACTIVE',
            dataJson: JSON.stringify({ startedTrigger: candidateId || normalizedInput }),
          },
        });

        // Log Conversion Event for Qualification Started
        await prisma.conversionEvent.create({
          data: {
            contactId,
            eventName: 'QualificationStarted',
            metadata: JSON.stringify({ flowSlug: flow.slug, trigger: candidateId || normalizedInput }),
          },
        }).catch(() => {});

        // Send Step 1 Interactive Message
        await sendStepMessage(client, phoneNumber, contactId, firstStep);

        logger.info(
          { contactId, flowSlug: flow.slug, sessionId: session.id },
          '[ConversationEngine] Started new ConversationFlow session'
        );

        return true;
      }
    }
  } catch (error) {
    logger.error({ error }, '[ConversationEngine] Error processing conversation event');
  }

  return false;
}
