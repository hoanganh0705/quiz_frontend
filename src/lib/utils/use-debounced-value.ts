import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_DEBOUNCE_WINDOW_MS = 300 as const;
export const MIN_DEBOUNCE_WINDOW_MS = 150 as const;
export const MAX_DEBOUNCE_WINDOW_MS = 600 as const;

export function clampDebounceWindow(inputMs: number): number {
  if (!Number.isFinite(inputMs)) return DEFAULT_DEBOUNCE_WINDOW_MS;
  if (inputMs < MIN_DEBOUNCE_WINDOW_MS) return MIN_DEBOUNCE_WINDOW_MS;
  if (inputMs > MAX_DEBOUNCE_WINDOW_MS) return MAX_DEBOUNCE_WINDOW_MS;
  return inputMs;
}

export interface UseDebouncedValueResult<T> {
  readonly debouncedValue: T;

  readonly cancel: () => void;
}

export function useDebouncedValue<T>(
  value: T,
  windowMs?: number,
): UseDebouncedValueResult<T> {
  const window = clampDebounceWindow(windowMs ?? DEFAULT_DEBOUNCE_WINDOW_MS);

  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  const latestValueRef = useRef<T>(value);

  const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }

    if (Object.is(value, debouncedValue)) {
      return;
    }

    timeoutHandleRef.current = setTimeout(() => {
      setDebouncedValue(latestValueRef.current);
      timeoutHandleRef.current = null;
    }, window);

    return () => {
      if (timeoutHandleRef.current !== null) {
        clearTimeout(timeoutHandleRef.current);
        timeoutHandleRef.current = null;
      }
    };
  }, [value, window, debouncedValue]);

  const cancel = useCallback(() => {
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }

    setDebouncedValue(latestValueRef.current);
  }, []);

  return { debouncedValue, cancel };
}

export function useDebouncedValueOnly<T>(value: T, windowMs?: number): T {
  return useDebouncedValue(value, windowMs).debouncedValue;
}
