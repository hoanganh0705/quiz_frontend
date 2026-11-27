"use client";

import { useCallback, useRef, useState } from "react";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";

import {
  defaultSubmitForgotPasswordDeps,
  submitForgotPassword,
  type ForgotSubmitResult,
  type SubmitForgotPasswordDeps,
} from "./forgot-password-submit";

export type UseForgotPasswordState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "cooldown" }
  | {
      status: "error";
      errorKind: "rate_limited" | "server" | "acknowledgement";
    };

export interface UseForgotPassword {
  state: UseForgotPasswordState;
  cooldownRemainingMs: number;
  start: (email: string) => Promise<ForgotSubmitResult>;
  reset: () => void;
}

const initialState: UseForgotPasswordState = { status: "idle" };

export function useForgotPassword(
  deps: SubmitForgotPasswordDeps = defaultSubmitForgotPasswordDeps,
): UseForgotPassword {
  const [state, setState] = useState<UseForgotPasswordState>(initialState);
  const inFlightRef = useRef<Promise<ForgotSubmitResult> | null>(null);

  const handleExpire = useCallback(() => {
    setState(initialState);
  }, []);

  const cooldown = useCooldownTimer({ onExpire: handleExpire });

  const start = useCallback(
    (email: string): Promise<ForgotSubmitResult> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: "pending" });

      const promise = submitForgotPassword(email, deps).then((result) => {
        inFlightRef.current = null;
        if (result.kind === "cooldown") {
          setState({ status: "cooldown" });
          cooldown.start(result.cooldownMs);
        } else {
          setState({
            status: "error",
            errorKind: result.errorKind as
              | "rate_limited"
              | "server"
              | "acknowledgement",
          });
        }
        return result;
      });

      inFlightRef.current = promise;
      return promise;
    },
    [deps, cooldown],
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    cooldown.stop();
    setState(initialState);
  }, [cooldown]);

  return {
    state,
    cooldownRemainingMs: state.status === "cooldown" ? cooldown.remainingMs : -1,
    start,
    reset,
  };
}
