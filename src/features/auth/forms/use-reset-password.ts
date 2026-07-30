"use client";

/**
 * `useResetPassword` — the React-binding layer over
 * `submitResetPassword`. Owns the single-flight discipline and the
 * post-success auth-state clear.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C5.
 *
 * ## State machine
 *
 *   `'idle'`     — initial; no SDK call has been issued for this
 *                  token.
 *   `'pending'`  — the SDK call is in flight.
 *   `'success'`  — the SDK call returned `201`. The helper has
 *                  already called `clearAuthToken()` and
 *                  `broadcastLogout()` exactly once. The page
 *                  resolves the route via `state.nextRoute` and
 *                  calls `router.replace(...)`.
 *   `'error'`    — the SDK call settled with a mapper-collapsed
 *                  kind. The page renders the same neutral
 *                  `'invalid_link'` body for the `invalid_link`
 *                  kind, or the recoverable failure copy for
 *                  `validation` / `rate_limited` / `server`.
 *
 * ## Single-flight
 *
 * Same pattern as `useForgotPassword` (TKT-2.3.C3). A pending
 * call's `Promise` is shared; concurrent `run()` calls return the
 * same reference. The slot releases on settle so the next click
 * can issue a fresh request.
 *
 * ## Side-effect discipline
 *
 * The hook delegates `clearAuthToken` and `broadcastLogout` to the
 * caller via the `SubmitResetPasswordDeps` parameter. The unit
 * suite (TKT-2.3.D3) asserts:
 *   - both helpers are called exactly once on success;
 *   - neither helper is called on `'invalid_link'` or any other
 *     error kind;
 *   - `'success'` never appears in the union the mapper returns
 *     (the helper resolves the `'success'` kind only after the
 *     `201` is observed).
 */

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
  /** Fire the reset submit. Single-flight: returns the in-flight `Promise` on a concurrent call. */
  run: (values: { token: string; newPassword: string }) => Promise<ResetSubmitResult>;
  /** Drop the in-flight slot; the next `run()` issues a fresh request. */
  reset: () => void;
}

const initialState: UseResetPasswordState = { status: "idle" };

export function useResetPassword(
  deps: SubmitResetPasswordDeps = defaultSubmitResetPasswordDeps,
): UseResetPassword {
  const [state, setState] = useState<UseResetPasswordState>(initialState);

  // In-flight slot. Stored in a ref so rapid re-renders do not
  // re-create it.
  const inFlightRef = useRef<Promise<ResetSubmitResult> | null>(null);

  const run = useCallback(
    (values: { token: string; newPassword: string }): Promise<ResetSubmitResult> => {
      // Single-flight: a pending call's Promise is shared.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: "pending" });

      const promise = submitResetPassword(values.token, values.newPassword, deps).then(
        (result) => {
          // Release the slot on settle so the next click can issue
          // a fresh request.
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