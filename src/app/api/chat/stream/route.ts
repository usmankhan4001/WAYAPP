import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { session } = authResult;
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');

  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      // Send initial connection established message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      let lastChecked = new Date(Date.now() - 5000);
      let loopCount = 0;

      while (!isClosed) {
        try {
          loopCount++;

          // Send heartbeat ping every ~14 seconds (7 * 2s) to prevent proxy socket timeout
          if (loopCount % 7 === 0) {
            controller.enqueue(new TextEncoder().encode(`: keepalive\n\n`));
          }

          // Poll the database efficiently for new messages received since lastChecked
          const whereClause: any = { timestamp: { gt: lastChecked } };
          
          if (contactId) {
            whereClause.contactId = contactId;
          } else {
            // Global inbox stream: for MEMBER role, include assigned to me OR unassigned conversations
            if (session.role === 'MEMBER') {
              whereClause.OR = [
                { conversation: { assignedToId: session.userId } },
                { conversation: { assignedToId: null } },
              ];
            }
          }

          const newMessages = await prisma.chatMessage.findMany({
            where: whereClause,
            include: { conversation: { select: { unreadCount: true, status: true, contactId: true } } },
            orderBy: { timestamp: 'asc' },
          });

          if (newMessages.length > 0) {
            lastChecked = newMessages[newMessages.length - 1].timestamp;
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: 'new_messages', data: newMessages })}\n\n`)
            );
          }

          // Wait 2 seconds before polling again
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error('SSE Error:', error);
          if (!isClosed) {
            controller.error(error);
          }
          break;
        }
      }
    },
    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
