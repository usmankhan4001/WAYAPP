import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { FlowNode, FlowEdge } from '@/worker/flows';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { input, currentNodeId: incomingNodeId, variables: incomingVars } = body;

    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    let nodes: FlowNode[] = [];
    let edges: FlowEdge[] = [];
    try {
      nodes = JSON.parse(flow.nodesJson || '[]');
      edges = JSON.parse(flow.edgesJson || '[]');
    } catch {
      return NextResponse.json({ error: 'Corrupt flow canvas JSON' }, { status: 400 });
    }

    const variables: Record<string, any> = {
      firstName: 'John',
      phoneNumber: '+971501234567',
      ...(incomingVars || {}),
    };

    if (input) {
      variables.lastInput = input;
    }

    let currentNodeId = incomingNodeId || flow.startNodeId || nodes[0]?.id;
    const simulationLogs: any[] = [];
    let outgoingMessage: string | null = null;
    let buttons: any[] | null = null;
    let steps = 0;

    while (currentNodeId && steps < 20) {
      steps++;
      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      simulationLogs.push({
        nodeId: node.id,
        type: node.type,
        label: node.data?.label || node.type,
      });

      if (node.type === 'message' || node.type === 'send_message') {
        let text = node.data?.text || '';
        text = text.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] || '');
        outgoingMessage = text;
        const nextEdge = edges.find((e) => e.source === node.id);
        currentNodeId = nextEdge ? nextEdge.target : null;
        break; // Pause to show message
      }

      if (node.type === 'quick_reply' || node.type === 'buttons') {
        outgoingMessage = node.data?.text || 'Select an option:';
        buttons = node.data?.buttons || [];
        break; // Pause for user input
      }

      if (node.type === 'condition') {
        const field = node.data?.field || 'lastInput';
        const operator = node.data?.operator || 'equals';
        const targetVal = (node.data?.value || '').toLowerCase();
        const actualVal = String(variables[field] || '').toLowerCase();

        let conditionMet = false;
        if (operator === 'equals') conditionMet = actualVal === targetVal;
        else if (operator === 'contains') conditionMet = actualVal.includes(targetVal);

        const branchEdge = edges.find((e) =>
          e.source === node.id && (conditionMet ? e.sourceHandle === 'true' : e.sourceHandle === 'false')
        ) || edges.find((e) => e.source === node.id);

        currentNodeId = branchEdge ? branchEdge.target : null;
        continue;
      }

      if (node.type === 'action') {
        if (node.data?.attributeKey) {
          variables[node.data.attributeKey] = node.data.attributeValue;
        }
        const nextEdge = edges.find((e) => e.source === node.id);
        currentNodeId = nextEdge ? nextEdge.target : null;
        continue;
      }

      if (node.type === 'end') {
        currentNodeId = null;
        break;
      }

      const nextEdge = edges.find((e) => e.source === node.id);
      currentNodeId = nextEdge ? nextEdge.target : null;
    }

    return NextResponse.json({
      success: true,
      currentNodeId,
      message: outgoingMessage,
      buttons,
      variables,
      logs: simulationLogs,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in flow simulator');
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
