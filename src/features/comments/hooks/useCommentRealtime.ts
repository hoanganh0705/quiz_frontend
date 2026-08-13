/**
 * `useCommentRealtime` — live comment updates via Socket.IO with direct cache application.
 *
 * Connects to the `/comments` namespace, subscribes to the quiz-scoped room,
 * and directly applies WebSocket events to the SWR cache without refetching.
 * This enables truly-live updates where:
 *   - New comments appear instantly
 *   - Edits reflect immediately
 *   - Vote counts update in real-time
 *   - Delete/hide/restore transitions happen live
 *
 * ## SSR safety
 *
 * All Socket.IO operations are browser-only. The hook safely no-ops during
 * SSR — callers can guard with `typeof window === 'undefined'` or rely on
 * Next.js server components never rendering this hook.
 *
 * ## Mutation Deduplication
 *
 * When the user performs an action (create, vote, etc.), an optimistic update
 * is applied locally. The realtime event for that same action will arrive from
 * the server. To prevent duplicate processing:
 *   1. Pending operations are tracked with timestamps
 *   2. When a realtime event arrives, we check if it's already been optimistically applied
 *   3. If pending, we clear the pending state instead of applying again
 *
 * ## Event Types
 *
 * Handles:
 *   - comment_created: Add new comment to list, update reply counts
 *   - comment_edited: Update comment body, mark as edited
 *   - comment_deleted: Soft-delete (show placeholder) or remove
 *   - comment_hidden: Update visibility state
 *   - comment_restored: Update visibility state
 *   - vote_cast: Update vote counts and user's vote
 *   - vote_removed: Update vote counts and user's vote
 */

"use client";

import { useEffect, useCallback, useRef } from "react";

import { useSocket } from "@/lib/realtime";
import {
  COMMENTS_NAMESPACE,
  type CommentEventPayload,
  type CommentCreatedPayload,
  type CommentEditedPayload,
  type CommentDeletedPayload,
  type CommentHiddenPayload,
  type CommentRestoredPayload,
  type VoteCastPayload,
  type VoteRemovedPayload,
} from "@/lib/realtime/events";

import {
  applyCommentCreated,
  applyCommentEdited,
  applyCommentDeleted,
  applyCommentHidden,
  applyCommentRestored,
  applyVoteCast,
  applyVoteRemoved,
} from "./useCommentCacheMutations";

/**
 * Options for the comment realtime hook.
 */
export interface UseCommentRealtimeOptions {
  /**
   * Set to false to disable realtime updates. Default: true.
   */
  enabled?: boolean;
}

/**
 * Return type for the comment realtime hook.
 */
export interface UseCommentRealtimeReturn {
  /** Whether the socket is connected. */
  isConnected: boolean;
  /** The current socket connection state. */
  connectionState:
    | "idle"
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "auth_required"
    | "error";
}

/**
 * Subscribe to live comment events for a quiz.
 *
 * @param quizId - The quiz ID to subscribe to (optional).
 * @param currentUserId - The current user's ID (optional, for filtering).
 * @param options.enabled - Set to false to disable realtime.
 *
 * @example
 * ```tsx
 * function QuizComments({ quizId }: { quizId: string }) {
 *   const { isConnected } = useCommentRealtime(quizId);
 *
 *   return (
 *     <div>
 *       {isConnected && <LiveIndicator />}
 *       <CommentThreadList quizId={quizId} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommentRealtime(
  quizId: string | null | undefined,
  currentUserId?: string | null | undefined,
  options: UseCommentRealtimeOptions = {},
): UseCommentRealtimeReturn {
  const { enabled = true } = options;

  const effectiveQuizId = quizId ?? null;
  const effectiveUserId = currentUserId ?? null;

  const { connectionState, socket } = useSocket(COMMENTS_NAMESPACE, {
    autoConnect: true,
    enabled: enabled && effectiveQuizId !== null,
  });

  const subscribedRef = useRef(false);
  const quizIdRef = useRef<string | null>(null);

  // ── Subscribe to quiz room ──────────────────────────────────────────

  const subscribeToQuiz = useCallback(
    (socketInstance: NonNullable<typeof socket>, quizIdToSubscribe: string) => {
      if (subscribedRef.current && quizIdRef.current === quizIdToSubscribe) {
        return; // Already subscribed to this quiz
      }

      // Unsubscribe from previous quiz if different
      if (subscribedRef.current && quizIdRef.current !== quizIdToSubscribe) {
        socketInstance.emit("unsubscribe_quiz", { quizId: quizIdRef.current });
      }

      socketInstance.emit("subscribe_quiz", { quizId: quizIdToSubscribe });
      subscribedRef.current = true;
      quizIdRef.current = quizIdToSubscribe;
    },
    [],
  );

  // Handle subscribe on connection and quizId change
  useEffect(() => {
    if (
      !enabled ||
      !effectiveQuizId ||
      !socket ||
      connectionState !== "connected"
    ) {
      return;
    }

    subscribeToQuiz(socket, effectiveQuizId);
  }, [enabled, effectiveQuizId, socket, connectionState, subscribeToQuiz]);

  // Handle unsubscribe on cleanup
  useEffect(() => {
    return () => {
      if (socket && quizIdRef.current) {
        socket.emit("unsubscribe_quiz", { quizId: quizIdRef.current });
        subscribedRef.current = false;
        quizIdRef.current = null;
      }
    };
  }, [socket]);

  // ── Direct application handlers ────────────────────────────────────

  const handleCommentCreated = useCallback(
    (payload: CommentCreatedPayload) => {
      // Don't apply if it's the current user's own comment (already optimistically added)
      if (effectiveUserId && payload.authorId === effectiveUserId) {
        return;
      }
      applyCommentCreated(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleCommentEdited = useCallback(
    (payload: CommentEditedPayload) => {
      // Don't apply if it's the current user's own comment (already optimistically updated)
      if (effectiveUserId && payload.authorId === effectiveUserId) {
        return;
      }
      applyCommentEdited(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleCommentDeleted = useCallback(
    (payload: CommentDeletedPayload) => {
      // Don't apply if it's the current user's own comment (already optimistically deleted)
      if (effectiveUserId && payload.authorId === effectiveUserId) {
        return;
      }
      applyCommentDeleted(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleCommentHidden = useCallback(
    (payload: CommentHiddenPayload) => {
      applyCommentHidden(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleCommentRestored = useCallback(
    (payload: CommentRestoredPayload) => {
      applyCommentRestored(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleVoteCast = useCallback(
    (payload: VoteCastPayload) => {
      // If it's the current user's own vote, skip (already optimistically applied)
      if (effectiveUserId && payload.voterId === effectiveUserId) {
        return;
      }
      applyVoteCast(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  const handleVoteRemoved = useCallback(
    (payload: VoteRemovedPayload) => {
      // If it's the current user's own unvote, skip (already optimistically applied)
      if (effectiveUserId && payload.voterId === effectiveUserId) {
        return;
      }
      applyVoteRemoved(payload, effectiveUserId);
    },
    [effectiveUserId],
  );

  // ── Register event listeners ────────────────────────────────────────

  useEffect(() => {
    if (!socket || !enabled || connectionState !== "connected") {
      return;
    }

    const handleCommentEvent = (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const payload = data as CommentEventPayload;

      // Route to the appropriate handler based on event type
      switch (payload.eventType) {
        case "comment_created":
          handleCommentCreated(payload as CommentCreatedPayload);
          break;
        case "comment_edited":
          handleCommentEdited(payload as CommentEditedPayload);
          break;
        case "comment_deleted":
          handleCommentDeleted(payload as CommentDeletedPayload);
          break;
        case "comment_hidden":
          handleCommentHidden(payload as CommentHiddenPayload);
          break;
        case "comment_restored":
          handleCommentRestored(payload as CommentRestoredPayload);
          break;
        case "vote_cast":
          handleVoteCast(payload as VoteCastPayload);
          break;
        case "vote_removed":
          handleVoteRemoved(payload as VoteRemovedPayload);
          break;
        // Other event types (mentioned, reported, etc.) are handled by notifications
      }
    };

    socket.on("comment", handleCommentEvent);

    return () => {
      socket.off("comment", handleCommentEvent);
    };
  }, [
    socket,
    enabled,
    connectionState,
    handleCommentCreated,
    handleCommentEdited,
    handleCommentDeleted,
    handleCommentHidden,
    handleCommentRestored,
    handleVoteCast,
    handleVoteRemoved,
  ]);

  return {
    isConnected: connectionState === "connected",
    connectionState,
  };
}
