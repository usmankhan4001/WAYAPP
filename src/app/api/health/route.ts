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
  
  const memoryUsage = process.memoryUsage();
  
  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      latencyMs: Date.now() - startTime,
      memory: {
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
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
