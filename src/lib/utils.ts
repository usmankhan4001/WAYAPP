import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { sanitizePhoneNumber, formatDisplayPhone } from "@/lib/whatsapp/phone";

/**
 * Normalizes a phone number to standard E.164 format using libphonenumber-js
 * Strips whitespace, brackets, hyphens, and uses default country code without blindly appending +1
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode: string = "+971"): string {
  if (!phone) return "";
  const result = sanitizePhoneNumber(phone, defaultCountryCode);
  return result.isValid ? result.e164 : result.e164 || phone.trim();
}

export function formatPhoneNumberDisplay(phone: string): string {
  if (!phone) return "";
  return formatDisplayPhone(phone);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSec < 60) return "just now";
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
  return `${Math.floor(diffInSec / 86400)}d ago`;
}
