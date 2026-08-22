import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export class AssignmentEngine {
  /**
   * Automatically routes an incoming conversation to the most available online agent.
   * Replicates WATI's team auto-routing capabilities.
   */
  static async routeConversation(conversationId: string): Promise<void> {
    try {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conv || conv.assignedToId) return; // Already assigned

      // 1. Fetch available agents (Role: MEMBER or ADMIN)
      const availableAgents = await prisma.user.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE', // Ideally should be real-time presence (e.g., 'ONLINE')
          role: { in: ['MEMBER', 'ADMIN'] }
        },
        select: { id: true }
      });

      if (availableAgents.length === 0) {
        logger.warn('AssignmentEngine: No available agents to route to.');
        return;
      }

      // 2. Capacity Check: Find how many active OPEN conversations each agent has
      const agentLoads = await prisma.conversation.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: availableAgents.map(a => a.id) },
          status: 'OPEN'
        },
        _count: { assignedToId: true }
      });

      // Map loads to agents, defaulting to 0 for agents with no chats
      const loadMap = new Map<string, number>();
      for (const agent of availableAgents) {
        loadMap.set(agent.id, 0);
      }
      for (const load of agentLoads) {
        if (load.assignedToId) {
          loadMap.set(load.assignedToId, load._count.assignedToId);
        }
      }

      // 3. Find the agent with the lowest capacity (Least Active Routing)
      let selectedAgentId = availableAgents[0].id;
      let minLoad = Infinity;

      for (const [agentId, load] of loadMap.entries()) {
        if (load < minLoad) {
          minLoad = load;
          selectedAgentId = agentId;
        }
      }

      // 4. Assign the conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { assignedToId: selectedAgentId }
      });

      await prisma.conversationEvent.create({
        data: {
          conversationId: conversationId,
          type: 'ASSIGNED',
          payload: JSON.stringify({ assignedToId: selectedAgentId, reason: 'auto_capacity_routing' }),
        }
      });

      logger.info({ conversationId, assignedToId: selectedAgentId, load: minLoad }, 'Conversation auto-assigned');

    } catch (error) {
      logger.error({ error, conversationId }, 'Error in AssignmentEngine routing');
    }
  }
}
