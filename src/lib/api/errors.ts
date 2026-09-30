import { NextResponse } from 'next/server';

/** The one error shape for every public API response: { error, code }. */
export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'not_found'
  | 'rate_limited'
  | 'conflict'
  | 'policy_violation'
  | 'send_failed'
  | 'internal_error';

export function apiError(error: string, code: ApiErrorCode, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, code, ...extra }, { status });
}
