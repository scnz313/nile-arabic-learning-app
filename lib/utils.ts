import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * Filters out non-string values to prevent runtime crashes.
 */
export function cn(...inputs: ClassValue[]) {
  // Filter to only allow string, boolean, undefined, null values
  // This prevents StyleSheet objects from crashing twMerge
  const safeInputs = inputs.filter(
    (v) => v === undefined || v === null || typeof v === "string" || typeof v === "boolean"
  );
  return twMerge(clsx(safeInputs));
}
