"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { mapAvailabilityError } from "@/features/auth/errors/register-error-mapper";

import type { AvailabilityStatus } from "@/features/auth/errors/register-error-mapper";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const DEFAULT_DEBOUNCE_MS = 350;

export function isWellFormedEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function isWellFormedUsername(value: string): boolean {
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) return false;
  return USERNAME_PATTERN.test(value);
}

export interface UseAvailabilityCheckInput {
  value: string;
  isValid: (value: string) => boolean;
  check: (value: string, signal: AbortSignal) => Promise<boolean>;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseAvailabilityCheckResult {
  status: AvailabilityStatus;
  debouncedValue: string;
}

export function useAvailabilityCheck({
  value,
  isValid,
  check,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAvailabilityCheckInput): UseAvailabilityCheckResult {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [debouncedValue, setDebouncedValue] = useState<string>("");

  const tokenRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const checkRef = useRef(check);

  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  const shouldFire = useMemo<boolean>(
    () => enabled && isValid(value),
    [enabled, isValid, value],
  );

  useEffect(() => {
    if (!shouldFire) {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      return;
    }

    const token = ++tokenRef.current;

    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;

      setDebouncedValue(value);
      setStatus("checking");

      checkRef
        .current(value, controller.signal)
        .then((available) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(available ? "available" : "unavailable");
        })
        .catch((err: unknown) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(mapAvailabilityError(err));
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
    };
  }, [value, shouldFire, debounceMs]);

  return {
    status: shouldFire ? status : "idle",
    debouncedValue: shouldFire ? debouncedValue : "",
  };
}
