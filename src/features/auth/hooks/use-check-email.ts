

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { checkEmail } from '@/features/auth/services/auth.service';
import { mapAvailabilityError } from '@/features/auth/errors/register-error-mapper';
import type { AvailabilityStatus } from '@/features/auth/errors/register-error-mapper';

export type UseCheckEmailInput = {
email: string;

enabled?: boolean;

debounceMs?: number;
};

export type UseCheckEmailResult = {
status: AvailabilityStatus;

debouncedEmail: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DEBOUNCE_MS = 350;

export function isWellFormedEmail(value: string): boolean {
return EMAIL_PATTERN.test(value);
}

export function useCheckEmail({
email,
enabled = true,
debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseCheckEmailInput): UseCheckEmailResult {
const [status, setStatus] = useState<AvailabilityStatus>('idle');
const [debouncedEmail, setDebouncedEmail] = useState<string>('');

const tokenRef = useRef(0);

const controllerRef = useRef<AbortController | null>(null);

const shouldFire = useMemo<boolean>(
() => enabled && isWellFormedEmail(email),
[enabled, email]
  );

useEffect(() => {
if (!shouldFire) {
if (controllerRef.current) controllerRef.current.abort();
controllerRef.current = null;

setDebouncedEmail('');
setStatus('idle');

return;
    }

const token = ++tokenRef.current;

const timer = window.setTimeout(() => {
const controller = new AbortController();
controllerRef.current = controller;

setDebouncedEmail(email);
setStatus('checking');

checkEmail({ email })
        .then((result) => {
if (tokenRef.current !== token) return;
if (controller.signal.aborted) return;
setStatus(result.data?.available ? 'available' : 'unavailable');
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
  }, [email, shouldFire, debounceMs]);

return { status, debouncedEmail };
}
