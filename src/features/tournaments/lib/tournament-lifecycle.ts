import type { TournamentStatus } from "@/features/tournaments/types";

export interface TournamentLifecycleInput {
  status?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}

function parseTimestamp(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Resolves the effective tournament lifecycle status by combining the
 * server-reported status with start/end timestamps so ended tournaments
 * never display as open for registration.
 */
export function resolveEffectiveTournamentStatus(
  tournament: TournamentLifecycleInput,
  now: Date = new Date(),
): TournamentStatus | undefined {
  const raw = tournament.status ?? undefined;

  if (raw === "cancelled") {
    return "cancelled";
  }
  if (raw === "finished") {
    return "finished";
  }

  const nowMs = now.getTime();
  const endMs = parseTimestamp(tournament.endAt);
  if (endMs !== null && endMs <= nowMs) {
    return "finished";
  }

  if (raw === "ongoing") {
    return "ongoing";
  }

  const startMs = parseTimestamp(tournament.startAt);
  if (startMs !== null && startMs <= nowMs) {
    return "ongoing";
  }

  if (raw === "upcoming" || raw === "registration") {
    return raw;
  }

  return undefined;
}

export function isTournamentClosed(
  tournament: TournamentLifecycleInput,
  now: Date = new Date(),
): boolean {
  const status = resolveEffectiveTournamentStatus(tournament, now);
  return status === "finished" || status === "cancelled";
}

export function isTournamentRegistrationOpen(
  tournament: TournamentLifecycleInput,
  now: Date = new Date(),
): boolean {
  const status = resolveEffectiveTournamentStatus(tournament, now);
  return status === "upcoming" || status === "registration";
}
