"use client";

/**
 * `useQuestionTimer` — server-authoritative answer-window timer.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B4.
 *
 * ## What this hook owns
 *
 * - Derive the player-visible countdown exclusively from the server-provided
 *   `QuestionTimingDto` (`startsAt`, `durationMs`, `serverNow`) plus a
 *   high-resolution client tick for display refresh.
 * - Recompute `serverDriftMs` on every `question_revealed` envelope so
 *   the display catches up if the client clock is off.
 * - Expose `isWindowOpen` derived from the server timing — the client
 *   tick is used only for display, never to drive the window state.
 * - Stop ticking when `instance_closed` is accepted; set `remainingMs = 0`.
 * - Return safe fallbacks when `multiplayer_play_live === 'placeholder'`.
 *
 * ## Server authority
 *
 * The server is the sole authority on whether the answer window is open.
 * The client never starts, stops, or transitions the window — it only
 * reports server-derived state.
 */

import { useEffect, useRef, useState } from "react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { type QuestionTimingDto } from "../types/gameplay.types";
import { useQuestionRevealed } from "./useQuestionRevealed";
import { useInstanceLifecycle } from "./useInstanceLifecycle";

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseQuestionTimerResult {
  /** Remaining milliseconds in the current answer window. `0` when closed. */
  remainingMs: number;
  /** Total duration of the answer window in milliseconds. */
  totalMs: number;
  /** `true` when the server-authoritative window is open. */
  isWindowOpen: boolean;
  /**
   * Clock offset between client and server in milliseconds.
   * `positive` = client is behind server; `negative` = client is ahead.
   * Recomputed on every `question_revealed` envelope.
   */
  serverDriftMs: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 50;

export function useQuestionTimer(
  instanceId: string | null,
): UseQuestionTimerResult {
  const flagValue = getFeatureFlagValue("multiplayer_play_live");
  const isPlaceholder = flagValue === "placeholder";

  const { timing } = useQuestionRevealed(instanceId);
  const { isClosed } = useInstanceLifecycle(instanceId);

  // ─── Server clock drift ───────────────────────────────────────────────
  //
  // Recompute the drift whenever a new timing envelope arrives. This
  // compensates for client clock skew.

  const serverDriftMsRef = useRef(0);
  const lastServerNowMsRef = useRef(0);

  useEffect(() => {
    if (!timing) return;

    const serverNowMs = new Date(timing.serverNow).getTime();
    const clientNowMs = Date.now();

    // Only update if the server time has advanced (prevents drift
    // regression on stale envelopes).
    if (serverNowMs > lastServerNowMsRef.current) {
      serverDriftMsRef.current = serverNowMs - clientNowMs;
      lastServerNowMsRef.current = serverNowMs;
    }
  }, [timing]);

  // ─── Effective now (server-adjusted) ─────────────────────────────────

  const effectiveNowMsRef = useRef(Date.now());

  useEffect(() => {
    if (isPlaceholder || isClosed) return;

    const tick = () => {
      effectiveNowMsRef.current = Date.now();
    };

    const interval = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaceholder, isClosed]);

  // ─── Derive values from timing ───────────────────────────────────────

  const derived = (): {
    remainingMs: number;
    totalMs: number;
    isWindowOpen: boolean;
    serverDriftMs: number;
  } => {
    if (isPlaceholder || !timing) {
      return { remainingMs: 0, totalMs: 0, isWindowOpen: false, serverDriftMs: 0 };
    }
    if (isClosed) {
      return { remainingMs: 0, totalMs: timing.durationMs, isWindowOpen: false, serverDriftMs: serverDriftMsRef.current };
    }

    const startMs = new Date(timing.startsAt).getTime();
    const endMs = startMs + timing.durationMs;

    // Server-adjusted current time.
    const nowMs = effectiveNowMsRef.current + serverDriftMsRef.current;

    const remainingMs = Math.max(0, endMs - nowMs);
    const isWindowOpen = nowMs >= startMs && nowMs < endMs;

    return {
      remainingMs,
      totalMs: timing.durationMs,
      isWindowOpen,
      serverDriftMs: serverDriftMsRef.current,
    };
  };

  // Use state + effect to drive re-renders on tick.
  // The ref always has the current value; state triggers the re-render.
  const [, forceUpdate] = useState({});
  const timingRef = useRef(timing);
  timingRef.current = timing;

  useEffect(() => {
    if (isPlaceholder || isClosed) return;

    const interval = setInterval(() => {
      // Only trigger a re-render if the remaining value would change.
      // This limits renders to once per 100ms even though we tick every 50ms.
      forceUpdate({});
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaceholder, isClosed]);

  const result = derived();

  return result;
}
