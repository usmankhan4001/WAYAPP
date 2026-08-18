import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a phone number to standard E.164 format
 * Strips whitespace, brackets, hyphens, and prepends default + country code if missing
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode: string = "+1"): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9+]/g, "").trim();
  if (!cleaned) return "";

  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (!cleaned.startsWith("+")) {
    const code = defaultCountryCode.startsWith("+") ? defaultCountryCode : `+${defaultCountryCode}`;
    // If it starts with leading zero (e.g. 0501234567 in UAE/UK), strip zero
    if (cleaned.startsWith("0")) {
      cleaned = code + cleaned.slice(1);
    } else {
      cleaned = code + cleaned;
    }
  }

  return cleaned;
}

export function formatPhoneNumberDisplay(phone: string): string {
  if (!phone) return "";
  return phone;
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
