"use client";

/**
 * `useVerifyEmail` — the React-binding layer over `submitVerifyEmail`.
 * Owns the single-flight discipline AND token-scoped re-fire
 * protection (TKT-2.2.C1 acceptance criterion #3).
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.C1.
 *
 * ## State machine
 *
 *   `'idle'`     — initial; no SDK call has been issued for the
 *                  current token.
 *   `'pending'`  — the SDK call is in flight.
 *   `'done'`     — the SDK call settled (success or any error kind
 *                  the mapper collapsed). The page renders the
 *                  same acknowledgement body for every backend
 *                  response — TKT-2.2.B2's mapper never produces
 *                  an `invalid` kind for a request that was
 *                  actually made.
 *   `'error'`    — the C2 client-side guard fired; the page renders
 *                  the same acknowledgement body (with neutral
 *                  wording) but the state is `'error'` so the page
 *                  can render the alternative title if it wants to.
 *   `'cooldown'` — reserved for the resend flow. Today the hook
 *                  never produces it; the union is kept for
 *                  symmetry so a generic `<VerifyEmailAcknowledgement>`
 *                  component could be reused on both pages.
 *
 * ## Single-flight
 *
 * Same pattern as `useRegistrationSubmit` (TKT-2.1.D2). A pending
 * call's `Promise` is shared; concurrent `run()` calls return the
 * same reference. The slot releases on settle so the next click
 * can issue a fresh request.
 *
 * ## Token-scoped re-fire protection
 *
 * The hook remembers the `token` it last fired for. If the same
 * token is re-asserted (e.g. React 19 strict-mode dev double
 * effect, a navigation that re-reads `?token=`), the hook will
 * NOT issue a second `submitVerifyEmail`. The acknowledgement is
 * already the same body for every backend response, so re-firing
 * would only spend a request.
 *
 * Resetting the token (i.e. the user lands on a different
 * `/verify-email?token=...`) starts a fresh attempt because the
 * page re-mounts the hook with a new `token` prop.
 */

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
  /** Fire the verify submit. Single-flight: returns the same in-flight `Promise` on a concurrent call. */
  run: () => Promise<VerifySubmitResult>;
  /** Drop the in-flight slot and the token memory; the next `run()` issues a fresh request for the same token. */
  reset: () => void;
}

const initialState: UseVerifyEmailState = { status: "idle" };

export function useVerifyEmail(
  token: string,
  deps: SubmitVerifyEmailDeps = defaultSubmitVerifyEmailDeps,
): UseVerifyEmail {
  const [state, setState] = useState<UseVerifyEmailState>(initialState);

  // In-flight slot. Stored in a ref so rapid re-renders do not
  // re-create it.
  const inFlightRef = useRef<Promise<VerifySubmitResult> | null>(null);

  // Last token this hook fired for. Prevents the same `token`
  // from re-firing across re-renders (React 19 strict-mode dev
  // double-invoke, a `useSearchParams` re-read, etc.). The page
  // resets the hook via `reset()` when the URL changes.
  const firedTokenRef = useRef<string | null>(null);

  // Drop the in-flight slot and the token memory on unmount so a
  // remount starts fresh.
  useEffect(() => {
    return () => {
      inFlightRef.current = null;
      firedTokenRef.current = null;
    };
  }, []);

  const run = useCallback((): Promise<VerifySubmitResult> => {
    // Token-scoped re-fire protection: if this hook already
    // fired for the same token, return the in-flight Promise
    // (or a settled 'done' resolution) without issuing a new
    // request. The page's strict-mode double-invoke then
    // converges to the same acknowledgement without a second
    // network call.
    if (firedTokenRef.current === token) {
      if (inFlightRef.current) return inFlightRef.current;
      // No in-flight Promise but the token has already been
      // processed. Synthesize a `done` result so the page
      // renders the acknowledgement body.
      return Promise.resolve({ kind: "done" } as VerifySubmitResult);
    }

    // C2 client-side guard: malformed tokens never reach the
    // backend. The page renders the same neutral body as a
    // successful response — the discriminator lets the page
    // swap the title if it wants to.
    if (!isWellFormedVerifyToken(token)) {
      const result: VerifySubmitResult = {
        kind: "error",
        errorKind: "invalid_link",
      };
      firedTokenRef.current = token;
      setState({ status: "error", errorKind: "invalid_link" });
      return Promise.resolve(result);
    }

    // Single-flight: a pending call's Promise is shared.
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    setState({ status: "pending" });
    firedTokenRef.current = token;

    const promise = submitVerifyEmail(token, deps).then((result) => {
      // Release the slot on settle so the next click can issue
      // a fresh request.
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

/**
 * Auto-run on mount. Many verify pages fire the verify call
 * immediately as the user lands on the URL — the helper is
 * exposed so the page can call `run()` from a `useEffect`
 * without re-implementing the single-flight or token-scoped
 * protections.
 */
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
