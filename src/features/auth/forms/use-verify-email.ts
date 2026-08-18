"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
isWellFormedVerifyToken,
submitVerifyEmail,
defaultSubmitVerifyEmailDeps,
type SubmitVerifyEmailDeps,
type VerifySubmitResult,
} from "./verify-email-submit";

export type UseVerifyEmailState =
| { status: "idle" }
  | { status: "pending" }
  | { status: "done" }
  | { status: "error"; errorKind: "invalid_link" | "rate_limited" | "server" }
  | { status: "cooldown" };

export interface UseVerifyEmail {
state: UseVerifyEmailState;

run: () => Promise<VerifySubmitResult>;

reset: () => void;
}

const initialState: UseVerifyEmailState = { status: "idle" };

export function useVerifyEmail(
token: string,
deps: SubmitVerifyEmailDeps = defaultSubmitVerifyEmailDeps,
): UseVerifyEmail {
const [state, setState] = useState<UseVerifyEmailState>(initialState);

const inFlightRef = useRef<Promise<VerifySubmitResult> | null>(null);

const firedTokenRef = useRef<string | null>(null);

useEffect(() => {
return () => {
inFlightRef.current = null;
firedTokenRef.current = null;
    };
  }, []);

const run = useCallback((): Promise<VerifySubmitResult> => {

if (firedTokenRef.current === token) {
if (inFlightRef.current) return inFlightRef.current;

return Promise.resolve({ kind: "done" } as VerifySubmitResult);
    }

if (!isWellFormedVerifyToken(token)) {
const result: VerifySubmitResult = {
kind: "error",
errorKind: "invalid_link",
      };
firedTokenRef.current = token;
setState({ status: "error", errorKind: "invalid_link" });
return Promise.resolve(result);
    }

if (inFlightRef.current) {
return inFlightRef.current;
    }

setState({ status: "pending" });
firedTokenRef.current = token;

const promise = submitVerifyEmail(token, deps).then((result) => {

inFlightRef.current = null;
if (result.kind === "done") {
setState({ status: "done" });
      } else {
setState({
status: "error",
errorKind: result.errorKind as
| "invalid_link"
            | "rate_limited"
            | "server",
        });
      }
return result;
    });

inFlightRef.current = promise;
return promise;
  }, [deps, token]);

const reset = useCallback(() => {
inFlightRef.current = null;
firedTokenRef.current = null;
setState(initialState);
  }, []);

return { state, run, reset };
}

export function useVerifyEmailAutoRun(
token: string,
deps: SubmitVerifyEmailDeps = defaultSubmitVerifyEmailDeps,
): UseVerifyEmail {
const hook = useVerifyEmail(token, deps);
useEffect(() => {
hook.run();
    // We intentionally exclude `hook` from the deps array — the
    // hook's identity changes on every render, and the token is
    // the only signal that should trigger a fresh run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
return hook;
}
