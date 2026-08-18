"use client";

import { useCallback, useRef, useState } from "react";

import {
submitResetPassword,
defaultSubmitResetPasswordDeps,
RESET_ACK_ROUTE,
type SubmitResetPasswordDeps,
type ResetSubmitResult,
} from "./reset-password-submit";

export type UseResetPasswordState =
| { status: "idle" }
  | { status: "pending" }
  | { status: "success"; nextRoute: typeof RESET_ACK_ROUTE }
  | {
status: "error";
errorKind: "invalid_link" | "validation" | "rate_limited" | "server";
    };

export interface UseResetPassword {
state: UseResetPasswordState;

run: (values: { token: string; newPassword: string }) => Promise<ResetSubmitResult>;

reset: () => void;
}

const initialState: UseResetPasswordState = { status: "idle" };

export function useResetPassword(
deps: SubmitResetPasswordDeps = defaultSubmitResetPasswordDeps,
): UseResetPassword {
const [state, setState] = useState<UseResetPasswordState>(initialState);

const inFlightRef = useRef<Promise<ResetSubmitResult> | null>(null);

const run = useCallback(
(values: { token: string; newPassword: string }): Promise<ResetSubmitResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setState({ status: "pending" });

const promise = submitResetPassword(values.token, values.newPassword, deps).then(
(result) => {

inFlightRef.current = null;
if (result.kind === "success") {
setState({
status: "success",
nextRoute: result.nextRoute,
            });
          } else {
setState({
status: "error",
errorKind: result.errorKind as
| "invalid_link"
                | "validation"
                | "rate_limited"
                | "server",
            });
          }
return result;
        },
      );

inFlightRef.current = promise;
return promise;
    },
[deps],
  );

const reset = useCallback(() => {
inFlightRef.current = null;
setState(initialState);
  }, []);

return { state, run, reset };
}