"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

export type OptimisticToggleKey =
  | string
  | readonly unknown[]
  | Record<PropertyKey, unknown>
  | null
  | undefined
  | false;

export type OptimisticToggleErrorKind =
  "http_429" | "http_404" | "http_4xx" | "http_5xx" | "unknown";

export interface OptimisticToggleError {
  kind: OptimisticToggleErrorKind;

  cause: ApiError | unknown;
}

export type OptimisticToggleStatus =
  "idle" | "pending" | "success" | "reverted";

export interface UseOptimisticToggleParams<ToggleArgs extends unknown[]> {
  currentValue: boolean;

  toggle: (...args: ToggleArgs) => Promise<unknown>;

  cooldownMs?: number;

  keysToInvalidate: readonly OptimisticToggleKey[];
}

export interface UseOptimisticToggleResult<ToggleArgs extends unknown[]> {
  status: OptimisticToggleStatus;

  lastError: OptimisticToggleError | null;

  toggle: (...args: ToggleArgs) => Promise<void>;
}

export function classifyOptimisticToggleError(
  cause: unknown,
): OptimisticToggleError {
  if (isApiError(cause)) {
    const status = cause.status;
    if (status === 429) {
      return { kind: "http_429", cause };
    }
    if (status === 404) {
      return { kind: "http_404", cause };
    }
    if (typeof status === "number" && status >= 400 && status < 500) {
      return { kind: "http_4xx", cause };
    }
    if (typeof status === "number" && status >= 500 && status < 600) {
      return { kind: "http_5xx", cause };
    }
    return { kind: "unknown", cause };
  }

  return { kind: "unknown", cause };
}

export function useOptimisticToggle<ToggleArgs extends unknown[]>({
  currentValue: _currentValue,
  toggle,
  cooldownMs = 0,
  keysToInvalidate,
}: UseOptimisticToggleParams<ToggleArgs>): UseOptimisticToggleResult<ToggleArgs> {
  const [status, setStatus] = useState<OptimisticToggleStatus>("idle");
  const [lastError, setLastError] = useState<OptimisticToggleError | null>(null);

  const lastInvocationRef = useRef<number>(-Infinity);

  const run = useCallback(
    async (...args: ToggleArgs): Promise<void> => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < cooldownMs) {
        return;
      }
      lastInvocationRef.current = now;

      setStatus("pending");
      setLastError(null);

      try {
        await toggle(...args);

        try {
          const qc = getQueryClient();
          for (const key of keysToInvalidate) {
            if (Array.isArray(key)) {
              void qc.invalidateQueries({ queryKey: key });
            } else if (typeof key === "string") {
              void qc.invalidateQueries({ queryKey: [key] });
            }
          }
        } catch {
          // ignore
        }

        setStatus("success");
        setLastError(null);
      } catch (cause: unknown) {
        const classification = classifyOptimisticToggleError(cause);

        if (classification.kind === "http_404") {
          try {
            const qc = getQueryClient();
            for (const key of keysToInvalidate) {
              if (Array.isArray(key)) {
                void qc.invalidateQueries({ queryKey: key });
              } else if (typeof key === "string") {
                void qc.invalidateQueries({ queryKey: [key] });
              }
            }
          } catch {
            // ignore
          }
        }

        setStatus("reverted");
        setLastError(classification);
      }
    },
    [toggle, cooldownMs, keysToInvalidate],
  );

  return {
    status,
    lastError,
    toggle: run,
  };
}
