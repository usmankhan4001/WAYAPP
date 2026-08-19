import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export interface PhoneSanitizationResult {
  isValid: boolean;
  e164: string;
  displayFormatted: string;
  country?: string;
  error?: string;
}

const DIAL_CODE_TO_ISO: Record<string, string> = {
  '971': 'AE',
  '966': 'SA',
  '974': 'QA',
  '965': 'KW',
  '973': 'BH',
  '968': 'OM',
  '92': 'PK',
  '91': 'IN',
  '44': 'GB',
  '1': 'US',
  '20': 'EG',
  '90': 'TR',
  '33': 'FR',
  '49': 'DE',
  '61': 'AU',
  '65': 'SG',
  '60': 'MY',
  '62': 'ID',
  '880': 'BD',
  '63': 'PH',
  '234': 'NG',
  '27': 'ZA',
  '7': 'RU',
  '86': 'CN',
};

/**
 * Resolves a country ISO code (e.g. 'AE', 'SA', 'US') from either an ISO code or dialing code ('+971', '971', '+1')
 */
export function resolveCountryIso(countryOrDialCode: string | undefined | null): CountryCode {
  if (!countryOrDialCode) return 'AE' as CountryCode;
  const clean = countryOrDialCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (/^[A-Z]{2}$/.test(clean)) {
    return clean as CountryCode;
  }
  return (DIAL_CODE_TO_ISO[clean] || 'AE') as CountryCode;
}

/**
 * Normalizes any raw phone input to standard international E.164 format using libphonenumber-js
 * Handles Meta webhook wa_id (e.g. 971501234567 -> +971501234567)
 * Never improperly prepends +1 to numbers that already have country codes
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

  const rawStr = String(rawInput).trim();
  if (!rawStr) {
    return {
      isValid: false,
      e164: '',
      displayFormatted: '',
      error: 'Phone number is empty',
    };
  }

  const defaultIso = resolveCountryIso(defaultCountry);

  // 1. Direct parse if input starts with '+'
  if (rawStr.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(rawStr);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.format('E.164'),
        displayFormatted: parsed.formatInternational(),
        country: parsed.country,
      };
    }
  }

  // 2. Handle '00' international prefix (e.g., 00971501234567)
  if (rawStr.startsWith('00')) {
    const withPlus = '+' + rawStr.substring(2);
    const parsed = parsePhoneNumberFromString(withPlus);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.format('E.164'),
        displayFormatted: parsed.formatInternational(),
        country: parsed.country,
      };
    }
  }

  // 3. Check if number is full international digits without plus (e.g. 971501234567, 966501234567, 923001234567)
  const digitsOnly = rawStr.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && !rawStr.startsWith('0')) {
    const parsedWithPlus = parsePhoneNumberFromString('+' + digitsOnly);
    if (parsedWithPlus && parsedWithPlus.isValid()) {
      return {
        isValid: true,
        e164: parsedWithPlus.format('E.164'),
        displayFormatted: parsedWithPlus.formatInternational(),
        country: parsedWithPlus.country,
      };
    }
  }

  // 4. Try parsing with default country ISO (e.g. local number 0501234567 in UAE)
  const parsedWithCountry = parsePhoneNumberFromString(rawStr, defaultIso);
  if (parsedWithCountry && parsedWithCountry.isValid()) {
    return {
      isValid: true,
      e164: parsedWithCountry.format('E.164'),
      displayFormatted: parsedWithCountry.formatInternational(),
      country: parsedWithCountry.country,
    };
  }

  // 5. Fallback E.164 regex format if already standard format
  const fallback = digitsOnly.startsWith('+') ? digitsOnly : '+' + digitsOnly;
  if (/^\+[1-9]\d{6,14}$/.test(fallback)) {
    return {
      isValid: true,
      e164: fallback,
      displayFormatted: fallback,
    };
  }

  return {
    isValid: false,
    e164: rawStr,
    displayFormatted: rawStr,
    error: 'Invalid E.164 phone number format',
  };
}

/**
 * Formats E.164 phone number nicely for UI display
 */
export function formatDisplayPhone(e164: string): string {
  try {
    const parsed = parsePhoneNumberFromString(e164);
    if (parsed && parsed.isValid()) {
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
