/**
 * Phone Number Sanitization & E.164 Validation Utility
 */

export interface PhoneSanitizationResult {
  isValid: boolean;
  e164: string;
  displayFormatted: string;
  error?: string;
}

/**
 * Normalizes any raw phone input to standard international E.164 format
 * Example: "050 123-4567" + defaultCountry "971" -> "+971501234567"
 * Example: "+1 (555) 019-2834" -> "+15550192834"
 */
export function sanitizePhoneNumber(
  rawInput: string | undefined | null,
  defaultCountryPrefix: string = '971'
): PhoneSanitizationResult {
  if (!rawInput) {
    return {
      isValid: false,
      e164: '',
      displayFormatted: '',
      error: 'Phone number is empty',
    };
  }

  // Strip all non-digits except initial '+'
  let cleaned = rawInput.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1).replace(/\D/g, '');
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2).replace(/\D/g, '');
  } else if (cleaned.startsWith('0') && defaultCountryPrefix) {
    // Leading national zero e.g. 050 -> 97150
    cleaned = `${defaultCountryPrefix.replace(/\D/g, '')}${cleaned.substring(1)}`;
  } else if (!cleaned.startsWith(defaultCountryPrefix.replace(/\D/g, '')) && cleaned.length <= 10) {
    // Assumed local number without country code
    cleaned = `${defaultCountryPrefix.replace(/\D/g, '')}${cleaned}`;
  }

  // E.164 standard: 7 to 15 digits
  if (cleaned.length < 7 || cleaned.length > 15) {
    return {
      isValid: false,
      e164: `+${cleaned}`,
      displayFormatted: rawInput,
      error: `Invalid length (${cleaned.length} digits). E.164 requires 7-15 digits.`,
    };
  }

  const e164 = `+${cleaned}`;

  return {
    isValid: true,
    e164,
    displayFormatted: formatDisplayPhone(e164),
  };
}

/**
 * Formats E.164 phone number nicely for UI display
 */
export function formatDisplayPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('971')) {
    // UAE format: +971 50 123 4567
    return `+971 ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    // US format: +1 (555) 019-2834
    return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
  }
  return e164;
}
