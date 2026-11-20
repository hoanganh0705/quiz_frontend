"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import {
  emitCrossTabBroadcast,
  type CrossTabBroadcastBareMessage,
} from "@/lib/api/core/cross-tab-broadcast";

export type OptimisticMutationKey = readonly unknown[];

export type OptimisticMutationPatcher<TData> = (
  current: TData | undefined,
) => TData | undefined;

export type OptimisticMutationRun<TResult> = () => Promise<TResult>;

export type OptimisticMutationStatus =
  "idle" | "pending" | "success" | "reverted" | "cooldown" | "cancelled";

export type OptimisticMutationConfirm = {
  kind: import("@/components/primitives/ConfirmDialog/confirm-copy").ConfirmKind;
  entityLabel?: string;
  typedOverride?: string;
};

export type OptimisticMutationBroadcast =
  | import("@/lib/api/core/cross-tab-broadcast").CrossTabBroadcastBareMessage
  | (() =>
      | import("@/lib/api/core/cross-tab-broadcast").CrossTabBroadcastBareMessage
      | null
      | undefined);

export type OptimisticMutationCall<TData, TResult> = {
  key: OptimisticMutationKey;

  optimisticData: OptimisticMutationPatcher<TData>;

  run: OptimisticMutationRun<TResult>;

  onSuccess?: (result: TResult) => void;

  onError?: (apiError: ApiError | unknown) => void;

  confirm?: OptimisticMutationConfirm;

  broadcasts?: OptimisticMutationBroadcast | OptimisticMutationBroadcast[];

  cooldownMs?: number;
};

export type OptimisticMutationResult<TResult> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; result: TResult }
  | { status: "reverted"; apiError: ApiError | unknown }
  | { status: "cooldown" }
  | { status: "cancelled" };

export type UseOptimisticMutationResult<TResult> = {
  lastResult: OptimisticMutationResult<TResult> | null;

  lastError: ApiError | unknown | null;

  isInFlight: boolean;

  mutate: <TData, TResult2>(
    call: OptimisticMutationCall<TData, TResult2>,
  ) => Promise<OptimisticMutationResult<TResult2>>;

  reset: () => void;
};

export const COOLDOWN_RESULT: { status: "cooldown" } = Object.freeze({
  status: "cooldown",
});

export function useOptimisticMutation(): UseOptimisticMutationResult<unknown> {
  const [lastResult, setLastResult] =
    useState<OptimisticMutationResult<unknown> | null>(null);
  const [lastError, setLastError] = useState<ApiError | unknown | null>(null);
  const [isInFlight, setIsInFlight] = useState(false);

  const lastInvocationRef = useRef<number>(0);

  const reset = useCallback(() => {
    setLastResult(null);
    setLastError(null);
    setIsInFlight(false);
  }, []);

  const mutate = useCallback(
    async <TData, TResult2>(
      call: OptimisticMutationCall<TData, TResult2>,
    ): Promise<OptimisticMutationResult<TResult2>> => {
      const cooldownMs = call.cooldownMs ?? 500;

      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastInvocationRef.current < cooldownMs) {
        const dropped: OptimisticMutationResult<TResult2> = {
          status: "cooldown",
        };
        setLastResult(dropped);
        return dropped;
      }
      lastInvocationRef.current = now;

      if (call.confirm) {
        const pending: OptimisticMutationResult<TResult2> = {
          status: "pending",
        };
        setLastResult(pending);
        return pending;
      }

      let snapshot: TData | undefined;
      try {
        snapshot = getQueryClient().getQueryData<TData>(call.key);
      } catch {
        // ignore
      }

      try {
        getQueryClient().setQueryData(call.key, call.optimisticData(snapshot));
      } catch {
        // ignore
      }

      setLastResult({ status: "pending" });
      setLastError(null);
      setIsInFlight(true);

      try {
        const result = await call.run();

        try {
          void getQueryClient().invalidateQueries({ queryKey: call.key });
        } catch {
          // ignore
        }

        if (call.broadcasts) {
          const list = Array.isArray(call.broadcasts)
            ? call.broadcasts
            : [call.broadcasts];
          for (const entry of list) {
            const env: CrossTabBroadcastBareMessage | null | undefined =
              typeof entry === "function"
                ? (
                    entry as () => CrossTabBroadcastBareMessage | null | undefined
                  )()
                : entry;
            if (env) emitCrossTabBroadcast(env);
          }
        }

        const success: OptimisticMutationResult<TResult2> = {
          status: "success",
          result,
        };
        setLastResult(success);
        setIsInFlight(false);
        call.onSuccess?.(result);
        return success;
      } catch (cause: unknown) {
        try {
          getQueryClient().setQueryData(call.key, snapshot);
        } catch {
          // ignore
        }

        const reverted: OptimisticMutationResult<TResult2> = {
          status: "reverted",
          apiError: cause,
        };
        setLastResult(reverted);
        setLastError(cause);
        setIsInFlight(false);
        call.onError?.(cause);
        return reverted;
      }
    },
    [],
  );

  return { lastResult, lastError, isInFlight, mutate, reset };
}

export function isApiErrorRejection(cause: unknown): cause is ApiError {
  return isApiError(cause);
}
