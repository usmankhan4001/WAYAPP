import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 32-byte AES key from AUTH_SECRET / ENCRYPTION_KEY.
 * Fail-closed in production: missing env throws instead of falling back
 * to a publicly-known key that would make stored tokens decryptable.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY;
  if (secret) {
    return crypto.createHash('sha256').update(secret).digest();
  }
  if (process.env.NODE_ENV !== 'production') {
    // Development/test-only key. Never used in production (see throw below).
    return crypto.createHash('sha256').update('wayapp-dev-only-secret-0123456789abcdef').digest();
  }
  throw new Error(
    '[Crypto] ENCRYPTION_KEY (or AUTH_SECRET) must be set in production. Generate one with: openssl rand -base64 48'
  );
}

/**
 * Encrypts a plaintext string with AES-256-GCM
 * Returns formatted string: "iv:tag:ciphertext" (in hex)
 */
export function encryptString(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  // Key resolution is intentionally OUTSIDE the try/catch so a missing
  // production ENCRYPTION_KEY fails loudly instead of storing plaintext.
  const key = getEncryptionKey();

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    return null;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string ("iv:tag:ciphertext")
 * Legacy plaintext values (no colon-separated iv:tag:ciphertext shape)
 * are returned as-is for backward compatibility. A value that LOOKS
 * encrypted but fails GCM authentication returns null (never echoed back),
 * so callers can distinguish "legacy plaintext" from "corrupted data".
 */
export function decryptString(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;

  // If text is not encrypted (does not match iv:tag:ciphertext format), return as is for backward compatibility
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText;
  }

  try {
    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();

    if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Tampered ciphertext or wrong key — do not echo the ciphertext back.
    return null;
  }
}

/**
 * Masks a sensitive token (shows first 4 and last 4 chars)
 */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return '';
  const clean = secret.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
