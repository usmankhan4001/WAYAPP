import parsePhoneNumber, { isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export interface PhoneSanitizationResult {
  isValid: boolean;
  e164: string;
  displayFormatted: string;
  country?: string;
  error?: string;
}

/**
 * Normalizes any raw phone input to standard international E.164 format using libphonenumber-js
 * Handles Meta webhook wa_id (e.g. 971501234567 -> +971501234567)
 */
export function sanitizePhoneNumber(
  rawInput: string | undefined | null,
  defaultCountry: string = 'AE'
): PhoneSanitizationResult {
  if (!rawInput) {
    return {
      isValid: false,
      e164: '',
      displayFormatted: '',
      error: 'Phone number is empty',
    };
  }

  let cleaned = rawInput.trim();

  // If incoming from Meta webhook without leading '+', prefix with '+' if it looks like international number
  if (!cleaned.startsWith('+') && !cleaned.startsWith('00')) {
    // If it starts with digits (e.g., 971... or 1...)
    if (/^\d{8,15}$/.test(cleaned)) {
      cleaned = `+${cleaned}`;
    }
  } else if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.substring(2)}`;
  }

  try {
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry as CountryCode);

    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        e164: phoneNumber.format('E.164'),
        displayFormatted: phoneNumber.formatInternational(),
        country: phoneNumber.country,
      };
    }
  } catch {
    // Fallback parser if strict parsing encounters edge case
  }

  // Fallback simple normalization
  const digits = cleaned.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : `+${digits}`;

  if (/^\+[1-9]\d{6,14}$/.test(e164)) {
    return {
      isValid: true,
      e164,
      displayFormatted: e164,
    };
  }

  return {
    isValid: false,
    e164,
    displayFormatted: rawInput,
    error: 'Invalid E.164 phone number format',
  };
}

/**
 * Formats E.164 phone number nicely for UI display
 */
export function formatDisplayPhone(e164: string): string {
  try {
    const parsed = parsePhoneNumber(e164);
    if (parsed) {
      return parsed.formatInternational();
    }
  } catch {}
  return e164;
}

/**
 * Checks if phone number is valid E.164
 */
export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
