import type { ReadonlyFieldState } from '@angular/forms/signals';

export function getMinMaxHint(min: number | undefined, max: number | undefined): string | null {
  if (min !== undefined && max !== undefined) {
    return `between ${min} and ${max}`;
  }
  if (min !== undefined) {
    return `Min: ${min}`;
  }
  if (max !== undefined) {
    return `Max: ${max}`;
  }

  return null;
}

export function getMinMaxLengthHint(
  minLength: number | undefined,
  maxLength: number | undefined,
): string | null {
  if (minLength !== undefined && maxLength !== undefined) {
    return `Length: between ${minLength} and ${maxLength} characters.`;
  }
  if (minLength !== undefined) {
    return `Min length: ${minLength} characters.`;
  }
  if (maxLength !== undefined) {
    return `Max length: ${maxLength} characters.`;
  }

  return null;
}
