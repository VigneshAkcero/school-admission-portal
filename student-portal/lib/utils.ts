import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTestCode(code: string) {
  const normalized = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!/^MPS\d{9}$/.test(normalized)) return code;
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9)}`;
}
