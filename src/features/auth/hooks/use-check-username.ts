

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

useEffect(() => {
if (!shouldFire) {
if (controllerRef.current) controllerRef.current.abort();
controllerRef.current = null;

setDebouncedUsername("");
setStatus("idle");

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
