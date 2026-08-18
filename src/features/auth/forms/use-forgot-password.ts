"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
submitForgotPassword,
defaultSubmitForgotPasswordDeps,
type SubmitForgotPasswordDeps,
type ForgotSubmitResult,
} from "./forgot-password-submit";

import {
FORGOT_PASSWORD_COOLDOWN_MS,
} from "./recovery-cooldown";

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
const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(-1);

const inFlightRef = useRef<Promise<ForgotSubmitResult> | null>(null);

const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const cooldownStartedAtRef = useRef<number | null>(null);
const cooldownDurationRef = useRef<number>(FORGOT_PASSWORD_COOLDOWN_MS);
const animationFrameRef = useRef<number | null>(null);

const stopCooldown = useCallback(() => {
if (cooldownTimerRef.current) {
clearTimeout(cooldownTimerRef.current);
cooldownTimerRef.current = null;
    }
if (animationFrameRef.current !== null) {
cancelAnimationFrame(animationFrameRef.current);
animationFrameRef.current = null;
    }
cooldownStartedAtRef.current = null;
setCooldownRemainingMs(-1);
  }, []);

useEffect(() => {
return () => {
stopCooldown();
    };
  }, [stopCooldown]);

const startCooldownTicker = useCallback(
(durationMs: number) => {
cooldownStartedAtRef.current = Date.now();
cooldownDurationRef.current = durationMs;
setCooldownRemainingMs(durationMs);

const tick = () => {
if (cooldownStartedAtRef.current === null) return;
const remaining = Math.max(
0,
cooldownDurationRef.current -
(Date.now() - cooldownStartedAtRef.current),
        );
setCooldownRemainingMs(remaining);
if (remaining > 0) {
animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
animationFrameRef.current = requestAnimationFrame(tick);

cooldownTimerRef.current = setTimeout(() => {
stopCooldown();
setState({ status: "idle" });
      }, durationMs);
    },
[stopCooldown],
  );

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
startCooldownTicker(result.cooldownMs);
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
[deps, startCooldownTicker],
  );

const reset = useCallback(() => {
inFlightRef.current = null;
stopCooldown();
setState(initialState);
  }, [stopCooldown]);

return { state, cooldownRemainingMs, start, reset };
}