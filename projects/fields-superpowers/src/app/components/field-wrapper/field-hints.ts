import type { ReadonlyFieldState } from '@angular/forms/signals';


export function getMinMaxHint(state: ReadonlyFieldState<unknown>): string | null {
  const min = state.min?.();
  const max = state.max?.();

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

export function getMinMaxLengthHint(state: ReadonlyFieldState<unknown>): string | null {
  const minLength = state.minLength?.();
  const maxLength = state.maxLength?.();

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
