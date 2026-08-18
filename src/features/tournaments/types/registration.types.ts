

import {
TOURNAMENT_CACHE_KEYS,
} from "./tournament.types";

export type RegistrationStatus =
| "registered"
  | "eligible"
  | "not_eligible"
  | "closed"
  | "full"
  | "unknown";

export type RegistrationErrorCode =
| "ALREADY_REGISTERED"
  | "NOT_REGISTERED"
  | "TOURNAMENT_REGISTRATION_CLOSED"
  | "TOURNAMENT_FULL"
  | "TOURNAMENT_INELIGIBLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "THROTTLED";

export interface ParticipationState {
tournamentId: string;
userId: string;
isRegistered: boolean;
registrationStatus: RegistrationStatus;
registeredAt: string | null;

canWithdraw: boolean;
}

export interface RegistrationResult {
tournamentId: string;
isRegistered: boolean;
registeredAt: string;
}

export interface WithdrawalResult {
tournamentId: string;
withdrawnAt: string;
}

export type RegistrationMutationState =
| "idle"
  | "pending"
  | "success"
  | "error";

export const TOURNAMENT_REGISTRATION_CACHE_KEYS = {

participation(tournamentId: string, userId: string) {
return ["tournaments", "participation", tournamentId, userId] as const;
  },

all(tournamentId: string) {
return {
detail: TOURNAMENT_CACHE_KEYS.detail(tournamentId),
participants: TOURNAMENT_CACHE_KEYS.participants(tournamentId, {}),
leaderboard: TOURNAMENT_CACHE_KEYS.leaderboard(tournamentId, {}),
    } as const;
  },
} as const;

export type RegistrationInvalidationKeys = ReturnType<
(typeof TOURNAMENT_REGISTRATION_CACHE_KEYS)["all"]
>;
