import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Remove Plus Codes and 5-6 digit ZIP codes from addresses, normalize spacing
export function cleanAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr
    .replace(/\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b/gi, "")
    .replace(/\b\d{5,6}\b/g, "")
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/^\s*,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
