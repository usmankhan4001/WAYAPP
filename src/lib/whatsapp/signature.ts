import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Validates Meta Webhook SHA256 HMAC signature
 * If appSecret is not yet configured in settings, allows webhook to proceed to avoid Meta disabling the endpoint.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null | undefined
): boolean {
  // If app secret is not configured in Settings, allow webhook through with warning log
  if (!appSecret || appSecret.trim() === '') {
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    logger.warn('Meta webhook received without required sha256 signature header');
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
