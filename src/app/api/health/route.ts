import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbError = null;

  try {
    // Ping database
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          error: dbError,
        },
        worker: {
          status: 'running',
        },
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
