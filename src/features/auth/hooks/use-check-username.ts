/**
 * `useCheckUsername` — debounced `GET /auth/check-username` hook.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.C2.
 *
 * Symmetric counterpart of `useCheckEmail` (TKT-2.1.C1). Same contract,
 * same stale-response guard, same anti-enumeration properties. The
 * username pattern mirrors the backend constraint documented in
 * `authControllerCheckUsernameParams` and the OpenAPI: `^[a-zA-Z0-9._-]+$`
 * with length 3–50.
 *
 * The 'unavailable' status for usernames is even more important than
 * for emails: usernames are public. The backend intentionally does
 * not distinguish "taken" from "reserved/blocked", and neither does
 * the UI.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { checkUsername } from "@/features/auth/services/auth.service";
import {
  mapAvailabilityError,
  type AvailabilityStatus,
} from "@/features/auth/errors/register-error-mapper";

export type UseCheckUsernameInput = {
  username: string;
  enabled?: boolean;
  debounceMs?: number;
};

export type UseCheckUsernameResult = {
  status: AvailabilityStatus;
  debouncedUsername: string;
};

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const DEFAULT_DEBOUNCE_MS = 350;

/**
 * Client-side gate for whether the username is well-formed enough to
 * bother the backend. The final word on validity is the `RegisterDto`
 * server-side validator; this is purely a debounce-bypass.
 */
export function isWellFormedUsername(value: string): boolean {
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) return false;
  return USERNAME_PATTERN.test(value);
}

export function useCheckUsername({
  username,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseCheckUsernameInput): UseCheckUsernameResult {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [debouncedUsername, setDebouncedUsername] = useState<string>("");

  const tokenRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const shouldFire = useMemo<boolean>(
    () => enabled && isWellFormedUsername(username),
    [enabled, username],
  );

  // Cleanup: abort pending request and reset state when input becomes invalid.
  // Setting state here is intentional to clear stale availability status.
  useEffect(() => {
    if (!shouldFire) {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      /* eslint-disable react-hooks/set-state-in-effect */
      setDebouncedUsername("");
      setStatus("idle");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const token = ++tokenRef.current;

    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;

      setDebouncedUsername(username);
      setStatus("checking");

      checkUsername({ username })
        .then((result) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(result.data.available ? "available" : "unavailable");
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
  }, [username, shouldFire, debounceMs]);

  return { status, debouncedUsername };
}
