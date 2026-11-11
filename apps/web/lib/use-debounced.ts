'use client';

import { useEffect, useState } from 'react';

/** `value`, updated only after it has been stable for `delayMs`. */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** A search term worth sending: trimmed, and at least 2 characters. */
export function searchTerm(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length >= 2 ? trimmed.slice(0, 100) : undefined;
}
