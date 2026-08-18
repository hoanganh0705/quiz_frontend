

import type { ApiError } from "@/lib/api/core/ApiError";
import type { DeletionErrorClassification } from "@/features/auth/errors/deletion-error-mapper";
import { DeletionAccountExistence } from "../lifecycle/deletion-revalidation";

export type DeletionState =
| DeletionIdleState
  | DeletionPendingState
  | DeletionUncertainState
  | DeletionCleanupState
  | DeletionCompletedState;

export interface DeletionIdleState {
readonly kind: "idle";

readonly error: DeletionStateError | null;

readonly lastRevalidation: DeletionAccountExistence | null;
}

export interface DeletionPendingState {
readonly kind: "pending";

readonly inFlight: Promise<unknown>;
readonly error: null;
readonly lastRevalidation: DeletionAccountExistence | null;
}

export interface DeletionUncertainState {
readonly kind: "uncertain";

readonly error: DeletionStateError;
readonly lastRevalidation: DeletionAccountExistence | null;
}

export interface DeletionCleanupState {
readonly kind: "cleanup";

readonly isFinalized: boolean;
readonly error: null;
readonly lastRevalidation: DeletionAccountExistence | null;
}

export interface DeletionCompletedState {
readonly kind: "completed";
readonly isFinalized: true;
readonly error: null;
readonly lastRevalidation: DeletionAccountExistence | null;
}

export interface DeletionStateError {
classification: DeletionErrorClassification;
cause: ApiError | unknown;
}

export const initialDeletionState: DeletionIdleState = {
kind: "idle",
error: null,
lastRevalidation: null,
};

export function assertNeverExhaustiveDeletionState(state: never): never {
throw new Error(`Unhandled deletion state: ${JSON.stringify(state)}`);
}

export function isDeletionIdle(
state: DeletionState,
): state is DeletionIdleState {
return state.kind === "idle";
}

export function isDeletionPending(
state: DeletionState,
): state is DeletionPendingState {
return state.kind === "pending";
}

export function isDeletionUncertain(
state: DeletionState,
): state is DeletionUncertainState {
return state.kind === "uncertain";
}

export function isDeletionCleanup(
state: DeletionState,
): state is DeletionCleanupState {
return state.kind === "cleanup";
}

export function isDeletionCompleted(
state: DeletionState,
): state is DeletionCompletedState {
return state.kind === "completed";
}

export function isTerminalDeletionState(state: DeletionState): boolean {
return state.kind === "cleanup" || state.kind === "completed";
}
