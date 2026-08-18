"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import { joinInstance } from "@/features/instances/services/instances.service";
import {
INSTANCE_CACHE_KEYS,
type InstanceJoinOutcome,
type InstanceLifecycleErrorCode,
type InstanceLifecycleMutationState,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
JoinInstanceResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseJoinInstanceResult {
join: () => Promise<void>;
state: InstanceLifecycleMutationState;
error: ApiError | null;
reset: () => void;
}

function mapToInstanceLifecycleErrorCode(
code: string | undefined,
): InstanceLifecycleErrorCode {
if (!code) return "GLOBAL_INTERNAL_ERROR";
switch (code) {
case "INSTANCE_FULL":
return "INSTANCE_FULL";
case "INSTANCE_CLOSED":
case "INSTANCE_ALREADY_CLOSED":
case "INSTANCE_ALREADY_FINISHED":
return "INSTANCE_CLOSED";
case "INSTANCE_ALREADY_JOINED":
return "INSTANCE_ALREADY_JOINED";
case "INSTANCE_FORBIDDEN":
return "INSTANCE_FORBIDDEN";
case "INSTANCE_NOT_FOUND":
return "INSTANCE_NOT_FOUND";
case "GLOBAL_UNAUTHENTICATED":
case "AUTH_TOKEN_EXPIRED":
case "AUTH_INVALID_TOKEN":
return "INSTANCE_AUTH_REQUIRED";
case "GLOBAL_FORBIDDEN":
case "FORBIDDEN":
return "GLOBAL_FORBIDDEN";
case "GLOBAL_NOT_FOUND":
return "GLOBAL_NOT_FOUND";
case "GLOBAL_VALIDATION_FAILED":
return "GLOBAL_VALIDATION_FAILED";
case "GLOBAL_INTERNAL_ERROR":
return "GLOBAL_INTERNAL_ERROR";
default:
return "GLOBAL_INTERNAL_ERROR";
  }
}

export function useJoinInstance(
instanceId: string | null,
): UseJoinInstanceResult {
const flagValue = getFeatureFlagValue("multiplayer_instances_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef(false);

const join = useCallback(async (): Promise<void> => {
if (isFlagPlaceholder || instanceId === null) {
return;
    }

if (state === "pending" || inFlightRef.current) {
return;
    }

inFlightRef.current = true;
setState("pending");
setError(null);

try {
const wire = (await joinInstance(instanceId)) as unknown as {
data?: JoinInstanceResponseDto;
      };

void wire;

const result: InstanceJoinOutcome = {
instanceId,
currentUserRole: "player",
joinedAt: new Date().toISOString(),
      };

const keys = INSTANCE_CACHE_KEYS.all(instanceId);
await Promise.all([
globalMutate(keys.detail, undefined, { revalidate: true }),
globalMutate(keys.players, undefined, { revalidate: true }),
      ]);

void result;
setState("success");
setError(null);

setTimeout(() => {
setState("idle");
      }, 1000);
    } catch (cause: unknown) {
const wrapped = coerceToApiError(cause);
const mappedCode = mapToInstanceLifecycleErrorCode(wrapped.code);
const mapped = ApiError.fromInput({
status: wrapped.status,
code: mappedCode,
message: wrapped.detail,
title: wrapped.title,
requestId: wrapped.requestId,
      });

if (!isApiError(cause)) {
        // network/parsing error — already wrapped
      }
setState("error");
setError(mapped);
    } finally {
inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, instanceId, state]);

const reset = useCallback(() => {
setState("idle");
setError(null);
inFlightRef.current = false;
  }, []);

return {
join,
state,
error,
reset,
  };
}
