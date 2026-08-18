"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getInstance } from "@/features/instances/services/instances.service";
import {
INSTANCE_CACHE_KEYS,
type InstanceDetail,
type InstanceLifecycleErrorCode,
type InstanceRole,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
InstanceDetailResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseInstanceResult {
instance: InstanceDetail | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
refresh: () => Promise<void>;
}

type GetInstanceWireResponse = {
data?: InstanceDetailResponseDto;
meta?: unknown;
};

function mapToInstanceLifecycleErrorCode(
code: string | undefined,
): InstanceLifecycleErrorCode {
if (!code) return "GLOBAL_INTERNAL_ERROR";

switch (code) {
case "INSTANCE_NOT_FOUND":
return "INSTANCE_NOT_FOUND";
case "INSTANCE_CLOSED":
case "INSTANCE_ALREADY_CLOSED":
case "INSTANCE_ALREADY_FINISHED":
return "INSTANCE_CLOSED";
case "INSTANCE_FULL":
return "INSTANCE_FULL";
case "INSTANCE_ALREADY_JOINED":
return "INSTANCE_ALREADY_JOINED";
case "INSTANCE_NOT_JOINED":
return "INSTANCE_NOT_JOINED";
case "INSTANCE_NOT_HOST":
case "HOST_REQUIRED":
return "INSTANCE_HOST_REQUIRED";
case "INSTANCE_FORBIDDEN":
return "INSTANCE_FORBIDDEN";
case "INSTANCE_ALREADY_STARTED":
case "INSTANCE_NOT_IN_COUNTDOWN":
case "INSTANCE_OPTIMISTIC_LOCK":
return "INSTANCE_INVALID_TRANSITION";
case "GLOBAL_UNAUTHENTICATED":
case "AUTH_TOKEN_EXPIRED":
case "AUTH_INVALID_TOKEN":
case "AUTH_REQUIRED":
return "INSTANCE_AUTH_REQUIRED";
case "GLOBAL_NOT_FOUND":
return "GLOBAL_NOT_FOUND";
case "GLOBAL_FORBIDDEN":
case "FORBIDDEN":
return "GLOBAL_FORBIDDEN";
case "GLOBAL_VALIDATION_FAILED":
return "GLOBAL_VALIDATION_FAILED";
case "GLOBAL_INTERNAL_ERROR":
return "GLOBAL_INTERNAL_ERROR";
default:
return "GLOBAL_INTERNAL_ERROR";
  }
}

function wrapAsInstanceApiError(err: unknown): ApiError {
if (err instanceof ApiError) {
return err;
  }

return new ApiError(
err as unknown as ConstructorParameters<typeof ApiError>[0],
  );
}

function deriveRole(
detail: InstanceDetailResponseDto,
currentUserId: string | null,
): InstanceRole {

void detail;
void currentUserId;
return null;
}

export function useInstance(
instanceId: string | null,
currentUserId: string | null = null,
): UseInstanceResult {
const flagValue = getFeatureFlagValue("multiplayer_instances_live");
const isFlagPlaceholder = flagValue === "placeholder";

const key = useMemo(
() =>
isFlagPlaceholder || instanceId === null
? null
: INSTANCE_CACHE_KEYS.detail(instanceId),
[isFlagPlaceholder, instanceId],
  );

const fetcher = useCallback(
async (): Promise<InstanceDetail | null> => {
if (isFlagPlaceholder || instanceId === null) {
return null;
      }

try {
const wire = (await getInstance(instanceId)) as unknown as GetInstanceWireResponse;

if (!wire.data) {

return null;
        }

const role = deriveRole(wire.data, currentUserId);

return {
...wire.data,
id: wire.data.instanceId,
currentUserRole: role,
        } as InstanceDetail;
      } catch (err) {

throw wrapAsInstanceApiError(err);
      }
    },
[isFlagPlaceholder, instanceId, currentUserId],
  );

const result = useSingleWithRetry<InstanceDetail | null>({
key,
fetcher,
  });

const refresh = useCallback(async () => {
await result.retry();

void result;
  }, [result]);

const mappedError = useMemo<ApiError | null>(() => {
if (result.error === null) return null;
const mappedCode = mapToInstanceLifecycleErrorCode(result.error.code);
return new ApiError({
...(result.error as unknown as object),
code: mappedCode,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [result.error]);

return {
instance: result.data ?? null,
isLoading: result.isLoading,
isStale: false,
error: mappedError,
refresh,
  };
}
