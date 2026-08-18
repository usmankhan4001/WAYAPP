import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { logger } from '@/lib/logger';

export interface FlowNodeData {
  label?: string;
  type?: string;
  text?: string;
  templateName?: string;
  buttons?: { id: string; title: string; nextNodeId?: string }[];
  field?: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value?: string;
  trueNodeId?: string;
  falseNodeId?: string;
  delayMinutes?: number;
  actionType?: 'ADD_TAG' | 'REMOVE_TAG' | 'ADD_TO_GROUP' | 'UPDATE_CONTACT';
  targetId?: string;
  attributeKey?: string;
  attributeValue?: string;
  targetNodeId?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  data: FlowNodeData;
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

/**
 * Initiates or advances an active flow run for an incoming event
 */
export async function processInboundFlow(params: {
  contactId: string;
  phoneNumber: string;
  bodyText: string;
}): Promise<boolean> {
  const { contactId, phoneNumber, bodyText } = params;

  try {
    // 1. Check if contact has an ACTIVE flow run waiting for reply
    const activeRun = await prisma.flowRun.findFirst({
      where: {
        contactId,
        status: 'ACTIVE',
      },
      include: { flow: true },
    });

    if (activeRun) {
      return await advanceFlowRun(activeRun.id, bodyText);
    }

    // 2. Otherwise, check if any PUBLISHED flow triggers match
    const publishedFlows = await prisma.flow.findMany({
      where: { status: 'PUBLISHED' },
    });

    const normalizedInput = bodyText.trim().toLowerCase();

    for (const flow of publishedFlows) {
      let nodes: FlowNode[] = [];
      let edges: FlowEdge[] = [];

      try {
        nodes = JSON.parse(flow.nodesJson || '[]');
        edges = JSON.parse(flow.edgesJson || '[]');
      } catch {
        continue;
      }

      const triggerNode = nodes.find((n) => n.type === 'trigger' || n.id === flow.startNodeId);
      if (!triggerNode) continue;

      let matches = false;
      const triggerType = triggerNode.data?.type || 'KEYWORD';
      const triggerKeyword = (triggerNode.data?.text || '').trim().toLowerCase();

      if (triggerType === 'ANY_INBOUND') {
        matches = true;
      } else if (triggerKeyword && normalizedInput.includes(triggerKeyword)) {
        matches = true;
      }

      if (matches) {
        // Create new FlowRun
        const newRun = await prisma.flowRun.create({
          data: {
            flowId: flow.id,
            contactId,
            currentNodeId: triggerNode.id,
            variables: JSON.stringify({ lastInput: bodyText }),
            status: 'ACTIVE',
          },
        });

        await advanceFlowRun(newRun.id, bodyText);
        return true;
      }
    }
  } catch (error) {
    logger.error({ error }, '[FlowEngine] Error matching flow');
  }

  return false;
}

/**
 * Advances a flow run step-by-step through its node graph
 */
export async function advanceFlowRun(runId: string, userInput?: string): Promise<boolean> {
  const run = await prisma.flowRun.findUnique({
    where: { id: runId },
    include: { flow: true, contact: true },
  });

  if (!run || run.status !== 'ACTIVE') return false;

  let nodes: FlowNode[] = [];
  let edges: FlowEdge[] = [];
  let variables: Record<string, any> = {};

  try {
    nodes = JSON.parse(run.flow.nodesJson || '[]');
    edges = JSON.parse(run.flow.edgesJson || '[]');
    variables = JSON.parse(run.variables || '{}');
  } catch {
    return false;
  }

  if (userInput) {
    variables.lastInput = userInput;
  }

  const client = await WhatsAppClient.createFromSettings();
  let currentNodeId: string | null = run.currentNodeId || run.flow.startNodeId || nodes[0]?.id || null;
  let stepsCount = 0;
  const MAX_STEPS = 50;

  while (currentNodeId && stepsCount < MAX_STEPS) {
    stepsCount++;
    const node = nodes.find((n) => n.id === currentNodeId);
    if (!node) break;

    // Log step
    await prisma.flowLog.create({
      data: {
        flowRunId: run.id,
        nodeId: node.id,
        action: node.type,
        status: 'SUCCESS',
      },
    }).catch(() => {});

    // 1. Message Node
    if (node.type === 'message' || node.type === 'send_message') {
      let text = node.data?.text || '';
      // Variable interpolation
      text = text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (key === 'firstName') return run.contact.firstName || '';
        if (key === 'phoneNumber') return run.contact.phoneNumber || '';
        return variables[key] !== undefined ? String(variables[key]) : '';
      });

      if (text.trim()) {
        await client.sendTextMessage(run.contact.phoneNumber, text);

        await prisma.chatMessage.create({
          data: {
            contactId: run.contactId,
            phoneNumber: run.contact.phoneNumber,
            direction: 'OUTBOUND',
            messageType: 'text',
            body: text,
            status: 'SENT',
          },
        });
      }

      // Move to next connected edge
      const nextEdge = edges.find((e) => e.source === node.id);
      currentNodeId = nextEdge ? nextEdge.target : null;
      continue;
    }

    // 2. Quick Reply / Interactive Buttons
    if (node.type === 'quick_reply' || node.type === 'buttons') {
      const buttons = node.data?.buttons || [];
      const text = node.data?.text || 'Please choose an option:';

      // If this is the first time reaching this node, send the prompt
      if (!userInput || run.currentNodeId !== node.id) {
        await client.sendTextMessage(
          run.contact.phoneNumber,
          `${text}\n\n${buttons.map((b: any, i: number) => `${i + 1}. ${b.title}`).join('\n')}`
        );

        // Pause flow run waiting for contact reply
        await prisma.flowRun.update({
          where: { id: run.id },
          data: {
            currentNodeId: node.id,
            variables: JSON.stringify(variables),
          },
        });
        return true;
      }

      // Contact has replied, match button choice
      const choice = userInput.trim().toLowerCase();
      const matchedBtn = buttons.find(
        (b, i) =>
          b.title.toLowerCase().includes(choice) ||
          choice === String(i + 1) ||
          b.id.toLowerCase() === choice
      );

      if (matchedBtn?.nextNodeId) {
        currentNodeId = matchedBtn.nextNodeId;
      } else {
        const nextEdge = edges.find((e) => e.source === node.id);
        currentNodeId = nextEdge ? nextEdge.target : null;
      }
      userInput = undefined; // Consumed
      continue;
    }

    // 3. Condition Node
    if (node.type === 'condition') {
      const field = node.data?.field || 'lastInput';
      const operator = node.data?.operator || 'equals';
      const targetVal = (node.data?.value || '').toLowerCase();
      const actualVal = String(variables[field] || '').toLowerCase();

      let conditionMet = false;
      if (operator === 'equals') conditionMet = actualVal === targetVal;
      else if (operator === 'contains') conditionMet = actualVal.includes(targetVal);
      else if (operator === 'greater_than') conditionMet = Number(actualVal) > Number(targetVal);
      else if (operator === 'less_than') conditionMet = Number(actualVal) < Number(targetVal);

      const branchEdge = edges.find((e) =>
        e.source === node.id && (conditionMet ? e.sourceHandle === 'true' : e.sourceHandle === 'false')
      ) || edges.find((e) => e.source === node.id);

      currentNodeId = branchEdge ? branchEdge.target : null;
      continue;
    }

    // 4. Action Node (Tags, Groups, Custom fields)
    if (node.type === 'action') {
      const actionType = node.data?.actionType;
      const targetId = node.data?.targetId;

      if (actionType === 'ADD_TAG' && targetId) {
        await prisma.contactsOnTags.upsert({
          where: { contactId_tagId: { contactId: run.contactId, tagId: targetId } },
          update: {},
          create: { contactId: run.contactId, tagId: targetId },
        }).catch(() => {});
      } else if (actionType === 'ADD_TO_GROUP' && targetId) {
        await prisma.contactsOnGroups.upsert({
          where: { contactId_groupId: { contactId: run.contactId, groupId: targetId } },
          update: {},
          create: { contactId: run.contactId, groupId: targetId },
        }).catch(() => {});
      } else if (actionType === 'UPDATE_CONTACT' && node.data?.attributeKey) {
        const attrKey = node.data.attributeKey;
        const attrVal = node.data.attributeValue || '';
        variables[attrKey] = attrVal;
      }

      const nextEdge = edges.find((e) => e.source === node.id);
      currentNodeId = nextEdge ? nextEdge.target : null;
      continue;
    }

    // 5. End Node
    if (node.type === 'end') {
      break;
    }

    // Default: follow first outgoing edge
    const nextEdge = edges.find((e) => e.source === node.id);
    currentNodeId = nextEdge ? nextEdge.target : null;
  }

  // Mark flow run completed
  await prisma.flowRun.update({
    where: { id: run.id },
    data: {
      status: 'COMPLETED',
      exitedAt: new Date(),
      variables: JSON.stringify(variables),
    },
  });

  return true;
}
