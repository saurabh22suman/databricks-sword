import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a Drizzle `publishedAt` value (which can be either a `Date`
 * or a Unix-seconds `number` depending on the column mode and runtime path)
 * into an ISO `YYYY-MM-DD` string suitable for `<time dateTime>` and
 * JSON API responses.
 *
 * Returns `""` for null/undefined.
 */
export function toIsoDate(value: Date | number | null | undefined): string {
  if (value == null) return ""
  const ms = value instanceof Date ? value.getTime() : Number(value) * 1000
  return new Date(ms).toISOString().split("T")[0]
}

/**
 * Formats a date string into a human-readable format.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

/**
 * Calculates estimated reading time for a given text.
 * Assumes average reading speed of 200 words per minute.
 */
export function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200
  const words = text.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

/**
 * Generates a URL-friendly slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}
