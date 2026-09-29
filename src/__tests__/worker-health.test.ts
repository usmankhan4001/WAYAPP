import { describe, it, expect, vi, afterEach } from 'vitest';
import { getWorkerStatus } from '@/lib/worker-health';

describe('getWorkerStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WORKER_HEALTH_URL;
  });

  it('is running when the worker health endpoint answers 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    expect(await getWorkerStatus()).toBe('running');
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3001/health');
  });

  it('is down when the worker is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(await getWorkerStatus()).toBe('down');
  });

  it('is down on a non-200 answer and honours WORKER_HEALTH_URL', async () => {
    process.env.WORKER_HEALTH_URL = 'http://worker:3001/health';
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    expect(await getWorkerStatus()).toBe('down');
    expect(fetchMock.mock.calls[0][0]).toBe('http://worker:3001/health');
  });
});
