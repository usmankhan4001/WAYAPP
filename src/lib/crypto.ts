import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 32-byte key from AUTH_SECRET or returns a deterministic key
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || 'wayapp-default-development-encryption-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string with AES-256-GCM
 * Returns formatted string: "iv:tag:ciphertext" (in hex)
 */
export function encryptString(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
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
      return encryptedText; // Fallback
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, might be plaintext or wrong key
    return encryptedText;
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
