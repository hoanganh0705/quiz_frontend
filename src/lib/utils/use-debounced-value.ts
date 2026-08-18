

import {
useCallback,
useEffect,
useRef,
useState,
} from "react";

import {
clampDebounceWindow,
DEBOUNCE_WINDOW_MS,
} from "@/features/social/discovery-invariants";

export interface UseDebouncedValueResult<T> {

readonly debouncedValue: T;

readonly cancel: () => void;
}

export function useDebouncedValue<T>(
value: T,
windowMs?: number,
): UseDebouncedValueResult<T> {
const window = clampDebounceWindow(windowMs ?? DEBOUNCE_WINDOW_MS);

const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

const latestValueRef = useRef<T>(value);

const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

latestValueRef.current = value;

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