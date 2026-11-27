"use client";

import { useCallback, useRef, useState } from "react";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";

import {
  defaultSubmitResendDeps,
  RESEND_COOLDOWN_MS,
  submitResendVerification,
  type ResendSubmitResult,
  type SubmitResendVerificationDeps,
} from "./resend-verification-submit";

import type { ResendVerificationFormValues } from "./schemas/recovery-email.schema";

export type UseResendVerificationState =
  | { status: "idle" }
  | { status: "pending" }
  | {
      status: "cooldown";
      cooldownMs: number;
      cooldownRemainingMs: number;
    }
  | { status: "error"; errorKind: "rate_limited" | "server" };

export interface UseResendVerification {
  state: UseResendVerificationState;
  start: (values: ResendVerificationFormValues) => Promise<ResendSubmitResult>;
  reset: () => void;
}

const initialState: UseResendVerificationState = { status: "idle" };

export function useResendVerification(
  deps: SubmitResendVerificationDeps = defaultSubmitResendDeps,
): UseResendVerification {
  const [rawState, setRawState] = useState<
    | { status: "idle" }
    | { status: "pending" }
    | { status: "cooldown"; cooldownMs: number }
    | { status: "error"; errorKind: "rate_limited" | "server" }
  >(initialState);

  const inFlightRef = useRef<Promise<ResendSubmitResult> | null>(null);

  const handleExpire = useCallback(() => {
    setRawState(initialState);
  }, []);

  const cooldown = useCooldownTimer({ onExpire: handleExpire });

  const start = useCallback(
    (values: ResendVerificationFormValues): Promise<ResendSubmitResult> => {
      if (rawState.status === "cooldown" && cooldown.isActive) {
        return Promise.resolve({
          kind: "cooldown",
          cooldownMs: cooldown.remainingMs,
        } as ResendSubmitResult);
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setRawState({ status: "pending" });

      const promise = submitResendVerification(values, deps).then((result) => {
        inFlightRef.current = null;
        if (result.kind === "cooldown") {
          setRawState({
            status: "cooldown",
            cooldownMs: result.cooldownMs,
          });
          cooldown.start(result.cooldownMs);
        } else {
          setRawState({ status: "error", errorKind: result.errorKind });
        }
        return result;
      });

      inFlightRef.current = promise;
      return promise;
    },
    [deps, rawState.status, cooldown],
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    cooldown.stop();
    setRawState(initialState);
  }, [cooldown]);

  const state: UseResendVerificationState =
    rawState.status === "cooldown"
      ? {
          status: "cooldown",
          cooldownMs: rawState.cooldownMs,
          cooldownRemainingMs: cooldown.remainingMs,
        }
      : rawState;

  return { state, start, reset };
}

export { RESEND_COOLDOWN_MS };
