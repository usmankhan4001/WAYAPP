/**
 * Reports whether the background worker is actually alive.
 *
 * /api/health used to hard-code `worker: { status: 'running' }`. In the Dokploy
 * deployment (a single application, no compose worker service) nothing started the
 * worker at all, so outbound-webhook forwards sat in PENDING forever while the health
 * endpoint kept saying everything was fine. This asks the worker's own /health
 * listener (src/worker/index.ts) instead.
 *
 * Default target is the loopback worker embedded by docker-entrypoint.sh; the compose
 * file points WORKER_HEALTH_URL at its separate `worker` service.
 */
export async function getWorkerStatus(): Promise<'running' | 'down'> {
  const port = process.env.WORKER_HEALTH_PORT || '3001'
  const url = process.env.WORKER_HEALTH_URL || `http://127.0.0.1:${port}/health`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500), cache: 'no-store' })
    return res.ok ? 'running' : 'down'
  } catch {
    return 'down'
  }
}
