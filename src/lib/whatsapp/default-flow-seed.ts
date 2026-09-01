import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const DEFAULT_FLOW_NAME = 'Lead Qualification (Example)';

/**
 * Ensures the built-in example Lead Qualification flow exists as a real
 * Visual Flow Builder record (Flow + node graph), so it's visible and
 * editable in the canvas rather than a hidden, code-defined system.
 *
 * Uses only node types the runtime interpreter (src/worker/flows.ts) and
 * canvas editor (src/app/flows/[id]/page.tsx) both support: trigger,
 * message, quick_reply, condition, action. There is no native WhatsApp
 * interactive-list support or multi-factor scoring in this engine, so the
 * "lead temperature" tagging below is a simple approximation based on the
 * timeline answer alone, not the old weighted score.
 */
export async function ensureDefaultFlow(): Promise<void> {
  try {
    const existing = await prisma.flow.findFirst({ where: { name: DEFAULT_FLOW_NAME } });
    if (existing) return;

    // Ensure the tags this flow assigns actually exist, so action nodes can
    // reference real tag ids.
    const qualifiedTag = await prisma.tag.upsert({
      where: { name: 'Qualified Lead' },
      update: {},
      create: { name: 'Qualified Lead', color: '#10b981' },
    });
    const hotTag = await prisma.tag.upsert({
      where: { name: 'HOT Lead 🔥' },
      update: {},
      create: { name: 'HOT Lead 🔥', color: '#ef4444' },
    });
    const warmTag = await prisma.tag.upsert({
      where: { name: 'WARM Lead 🟡' },
      update: {},
      create: { name: 'WARM Lead 🟡', color: '#f59e0b' },
    });

    const nodes = [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 400, y: 0 },
        data: { label: 'Start Trigger', type: 'KEYWORD', text: 'qualify' },
      },
      {
        id: 'intro_msg',
        type: 'message',
        position: { x: 400, y: 150 },
        data: {
          label: 'Intro',
          text: "Let's find the right fit for you, {{firstName}}! I'll ask a few quick questions.",
        },
      },
      {
        id: 'qr_business',
        type: 'quick_reply',
        position: { x: 400, y: 300 },
        data: {
          label: 'Business Activity',
          text: 'What is your business activity?',
          buttons: [
            { id: 'business_ecommerce', title: 'E-commerce' },
            { id: 'business_consulting_agency', title: 'Consulting / Agency' },
            { id: 'business_saas_it', title: 'SaaS / IT Services' },
            { id: 'business_trading_general', title: 'Trading / Real Estate' },
            { id: 'business_other', title: 'Other Activities' },
          ],
        },
      },
      {
        id: 'qr_region',
        type: 'quick_reply',
        position: { x: 400, y: 450 },
        data: {
          label: 'Region',
          text: 'Great! Which region are you based in?',
          buttons: [
            { id: 'region_north_america', title: 'North America' },
            { id: 'region_europe', title: 'Europe' },
            { id: 'region_middle_east', title: 'Middle East' },
            { id: 'region_asia_pacific', title: 'Asia Pacific' },
            { id: 'region_other', title: 'Other Region' },
          ],
        },
      },
      {
        id: 'qr_goal',
        type: 'quick_reply',
        position: { x: 400, y: 600 },
        data: {
          label: 'Goal',
          text: 'What can we help you with?',
          buttons: [
            { id: 'goal_pricing', title: 'Pricing & Plans' },
            { id: 'goal_demo', title: 'Product Demo' },
            { id: 'goal_support', title: 'Support / Existing Customer' },
            { id: 'goal_partnership', title: 'Partnership / Bulk Inquiry' },
            { id: 'goal_other', title: 'Other / General Inquiry' },
          ],
        },
      },
      {
        id: 'qr_timeline',
        type: 'quick_reply',
        position: { x: 400, y: 750 },
        data: {
          label: 'Timeline',
          text: 'When are you looking to get started?',
          buttons: [
            { id: 'timeline_immediately', title: 'Immediately' },
            { id: 'timeline_one_month', title: 'Within 1 Month' },
            { id: 'timeline_three_months', title: 'Within 3 Months' },
            { id: 'timeline_exploring', title: 'Just Exploring' },
          ],
        },
      },
      {
        id: 'tag_qualified',
        type: 'action',
        position: { x: 400, y: 900 },
        data: { label: 'Tag: Qualified Lead', actionType: 'ADD_TAG', targetId: qualifiedTag.id },
      },
      {
        id: 'check_hot',
        type: 'condition',
        position: { x: 400, y: 1050 },
        data: { field: 'lastInput', operator: 'contains', value: 'immediately' },
      },
      {
        id: 'tag_hot',
        type: 'action',
        position: { x: 150, y: 1200 },
        data: { label: 'Tag: HOT Lead', actionType: 'ADD_TAG', targetId: hotTag.id },
      },
      {
        id: 'check_warm',
        type: 'condition',
        position: { x: 650, y: 1200 },
        data: { field: 'lastInput', operator: 'contains', value: 'month' },
      },
      {
        id: 'tag_warm',
        type: 'action',
        position: { x: 650, y: 1350 },
        data: { label: 'Tag: WARM Lead', actionType: 'ADD_TAG', targetId: warmTag.id },
      },
      {
        id: 'completion_msg',
        type: 'message',
        position: { x: 400, y: 1500 },
        data: {
          label: 'Completion',
          text: '🎉 Thank you for sharing your details!\n\nOur team has received your qualification profile and will reach out to you shortly right here on WhatsApp.',
        },
      },
    ];

    const edges = [
      { id: 'e1', source: 'trigger_1', target: 'intro_msg' },
      { id: 'e2', source: 'intro_msg', target: 'qr_business' },
      { id: 'e3', source: 'qr_business', target: 'qr_region' },
      { id: 'e4', source: 'qr_region', target: 'qr_goal' },
      { id: 'e5', source: 'qr_goal', target: 'qr_timeline' },
      { id: 'e6', source: 'qr_timeline', target: 'tag_qualified' },
      { id: 'e7', source: 'tag_qualified', target: 'check_hot' },
      { id: 'e8', source: 'check_hot', target: 'tag_hot', sourceHandle: 'true' },
      { id: 'e9', source: 'check_hot', target: 'check_warm', sourceHandle: 'false' },
      { id: 'e10', source: 'tag_hot', target: 'completion_msg' },
      { id: 'e11', source: 'check_warm', target: 'tag_warm', sourceHandle: 'true' },
      { id: 'e12', source: 'check_warm', target: 'completion_msg', sourceHandle: 'false' },
      { id: 'e13', source: 'tag_warm', target: 'completion_msg' },
    ];

    await prisma.flow.create({
      data: {
        name: DEFAULT_FLOW_NAME,
        description: 'Example 4-step qualification funnel — customize the steps and questions for your own business',
        status: 'PUBLISHED',
        startNodeId: 'trigger_1',
        nodesJson: JSON.stringify(nodes),
        edgesJson: JSON.stringify(edges),
      },
    });

    logger.info('[Database] Example Lead Qualification flow registered in Visual Flow Builder');
  } catch (err: any) {
    logger.error({ err }, 'Error ensuring default example flow');
  }
}
