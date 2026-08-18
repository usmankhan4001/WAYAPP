import crypto from 'crypto';

/**
 * Validates Meta Webhook SHA256 HMAC signature
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret) {
    // If no app secret is configured, allow in development/mock mode
    return true;
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const signature = signatureHeader.substring(7);
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}
