'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
submitResendVerification,
defaultSubmitResendDeps,
RESEND_COOLDOWN_MS,
type SubmitResendVerificationDeps,
type ResendSubmitResult,
} from './resend-verification-submit';
import type { ResendVerificationFormValues } from './schemas/resend-verification.schema';

export type UseResendVerificationState =
| { status: 'idle' }
  | { status: 'pending' }
  | {
status: 'cooldown';

cooldownMs: number;

cooldownRemainingMs: number;
    }
  | { status: 'error'; errorKind: 'rate_limited' | 'server' };

export interface UseResendVerification {
state: UseResendVerificationState;

start: (values: ResendVerificationFormValues) => Promise<ResendSubmitResult>;

reset: () => void;
}

const initialState: UseResendVerificationState = { status: 'idle' };

export function useResendVerification(
deps: SubmitResendVerificationDeps = defaultSubmitResendDeps
): UseResendVerification {
const [state, setState] = useState<UseResendVerificationState>(initialState);

const inFlightRef = useRef<Promise<ResendSubmitResult> | null>(null);

const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const cooldownEndsAtRef = useRef<number | null>(null);

useEffect(() => {
return () => {
if (cooldownTimerRef.current) {
clearInterval(cooldownTimerRef.current);
cooldownTimerRef.current = null;
      }
cooldownEndsAtRef.current = null;
inFlightRef.current = null;
    };
  }, []);

const exitCooldown = useCallback(() => {
if (cooldownTimerRef.current) {
clearInterval(cooldownTimerRef.current);
cooldownTimerRef.current = null;
    }
cooldownEndsAtRef.current = null;
setState(initialState);
  }, []);

const start = useCallback(
(values: ResendVerificationFormValues): Promise<ResendSubmitResult> => {

if (state.status === 'cooldown' && cooldownEndsAtRef.current) {
if (Date.now() < cooldownEndsAtRef.current) {

return Promise.resolve({
kind: 'cooldown',
cooldownMs: Math.max(
0,
cooldownEndsAtRef.current - Date.now()
            ),
          } as ResendSubmitResult);
        }

exitCooldown();
      }

if (inFlightRef.current) {
return inFlightRef.current;
      }

setState({ status: 'pending' });

const promise = submitResendVerification(values, deps).then((result) => {
inFlightRef.current = null;
if (result.kind === 'cooldown') {
const endsAt = Date.now() + result.cooldownMs;
cooldownEndsAtRef.current = endsAt;
setState({
status: 'cooldown',
cooldownMs: result.cooldownMs,
cooldownRemainingMs: result.cooldownMs,
          });

cooldownTimerRef.current = setInterval(() => {
if (cooldownEndsAtRef.current == null) return;
const remaining = cooldownEndsAtRef.current - Date.now();
if (remaining <= 0) {
exitCooldown();
return;
            }
setState((prev) =>
prev.status === 'cooldown'
? { ...prev, cooldownRemainingMs: remaining }
: prev
            );
          }, 1000);
        } else {
setState({ status: 'error', errorKind: result.errorKind });
        }
return result;
      });

inFlightRef.current = promise;
return promise;
    },
[deps, state, exitCooldown]
  );

const reset = useCallback(() => {
inFlightRef.current = null;
if (cooldownTimerRef.current) {
clearInterval(cooldownTimerRef.current);
cooldownTimerRef.current = null;
    }
cooldownEndsAtRef.current = null;
setState(initialState);
  }, []);

return { state, start, reset };
}

export { RESEND_COOLDOWN_MS };