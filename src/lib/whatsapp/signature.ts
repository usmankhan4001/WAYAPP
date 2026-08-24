import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Validates Meta Webhook SHA256 HMAC signature.
 * Fail-closed: a missing appSecret or signature header rejects the request.
 * Meta never sends webhooks to an endpoint that is not fully verified, so
 * there is no legitimate case where a valid webhook lacks these values.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret || appSecret.trim() === '') {
    logger.warn('Meta webhook rejected: appSecret is not configured in Settings');
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    logger.warn('Meta webhook rejected: missing or malformed sha256 signature header');
    return false;
  }

  const signature = signatureHeader.substring(7).trim();
  const expectedSignature = crypto
    .createHmac('sha256', appSecret.trim())
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
