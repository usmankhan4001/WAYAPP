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

      let lastChecked = new Date();

      while (!isClosed) {
        try {
          // Poll the database efficiently for new messages for this specific user or conversation
          const whereClause: any = { createdAt: { gt: lastChecked } };
          
          if (contactId) {
            whereClause.contactId = contactId;
          } else {
            // Global inbox stream: only fetch messages for conversations assigned to me
            if (session.role === 'MEMBER') {
              whereClause.conversation = { assignedToId: session.userId };
            }
          }

          const newMessages = await prisma.chatMessage.findMany({
            where: whereClause,
            include: { conversation: { select: { unreadCount: true, status: true, contactId: true } } },
            orderBy: { createdAt: 'asc' },
          });

          if (newMessages.length > 0) {
            lastChecked = newMessages[newMessages.length - 1].createdAt;
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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
