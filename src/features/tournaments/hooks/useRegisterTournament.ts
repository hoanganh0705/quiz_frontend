"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { registerForTournament } from "@/features/tournaments/services/tournaments.service";
import {
TOURNAMENT_REGISTRATION_CACHE_KEYS,
type RegistrationMutationState,
} from "@/features/tournaments/types/registration.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
RegisterTournamentResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseRegisterTournamentResult {
register: () => Promise<void>;
state: RegistrationMutationState;
error: ApiError | null;
reset: () => void;
}

export function useRegisterTournament(
tournamentId: string | null,
): UseRegisterTournamentResult {
const flagValue = getFeatureFlagValue("tournaments_live");
const isFlagPlaceholder = flagValue === "placeholder";

const [state, setState] = useState<RegistrationMutationState>("idle");
const [error, setError] = useState<ApiError | null>(null);

const inFlightRef = useRef(false);

const register = useCallback(async (): Promise<void> => {

if (isFlagPlaceholder || tournamentId === null) {
return;
    }

if (state === "pending" || inFlightRef.current) {
return;
    }

inFlightRef.current = true;
setState("pending");
setError(null);

try {

const result = (await registerForTournament(tournamentId)) as {
data?: RegisterTournamentResponseDto;
      };

const keys = TOURNAMENT_REGISTRATION_CACHE_KEYS.all(tournamentId);
await Promise.all([
globalMutate(keys.detail, undefined, { revalidate: true }),
globalMutate(keys.participants, undefined, { revalidate: true }),
globalMutate(keys.leaderboard, undefined, { revalidate: true }),
      ]);

setState("success");
setError(null);

setTimeout(() => {
setState("idle");
      }, 2000);
    } catch (cause: unknown) {

if (isApiError(cause)) {

setState("error");
setError(cause);
      } else if (cause instanceof Error) {

const mappedError = new ApiError(
cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
setState("error");
setError(mappedError);
      } else {

const mappedError = new ApiError(
cause as unknown as ConstructorParameters<typeof ApiError>[0],
        );
setState("error");
setError(mappedError);
      }
    } finally {
inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, tournamentId, state]);

const reset = useCallback(() => {
setState("idle");
setError(null);
inFlightRef.current = false;
  }, []);

return {
register,
state,
error,
reset,
  };
}
