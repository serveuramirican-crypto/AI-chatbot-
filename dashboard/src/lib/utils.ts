import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUserContext(variables: Record<string, any>): string {
  if (!variables) return 'No user preferences selected yet';

  const validEntries = Object.entries(variables).filter(
    ([_, value]) => value !== null && value !== undefined && value !== ''
  );

  if (validEntries.length === 0) {
    return 'No user preferences selected yet';
  }

  return validEntries
    .map(([key, value], index) => {
      const formatted = `${key}: ${value}`;
      return index === 0 ? `- ${formatted}` : formatted;
    })
    .join('\n\n');
}
