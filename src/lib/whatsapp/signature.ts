import crypto from 'crypto';

/**
 * Validates Meta Webhook SHA256 HMAC signature (Fail-closed)
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null | undefined
): boolean {
  // Fail closed if app secret is not configured
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    // Allow without HMAC only if explicitly in local dev and mock mode
    return process.env.ALLOW_INSECURE_WEBHOOKS === 'true';
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const signature = signatureHeader.substring(7).trim();
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
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
