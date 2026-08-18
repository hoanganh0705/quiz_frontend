

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

export interface UseCommentRealtimeOptions {

enabled?: boolean;
}

export interface UseCommentRealtimeReturn {

isConnected: boolean;

connectionState:
| "idle"
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "auth_required"
    | "error";
}

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

const subscribeToQuiz = useCallback(
(socketInstance: NonNullable<typeof socket>, quizIdToSubscribe: string) => {
if (subscribedRef.current && quizIdRef.current === quizIdToSubscribe) {
return; // Already subscribed to this quiz
      }

if (subscribedRef.current && quizIdRef.current !== quizIdToSubscribe) {
socketInstance.emit("unsubscribe_quiz", { quizId: quizIdRef.current });
      }

socketInstance.emit("subscribe_quiz", { quizId: quizIdToSubscribe });
subscribedRef.current = true;
quizIdRef.current = quizIdToSubscribe;
    },
[],
  );

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

useEffect(() => {
return () => {
if (socket && quizIdRef.current) {
socket.emit("unsubscribe_quiz", { quizId: quizIdRef.current });
subscribedRef.current = false;
quizIdRef.current = null;
      }
    };
  }, [socket]);

const handleCommentCreated = useCallback(
(payload: CommentCreatedPayload) => {

if (effectiveUserId && payload.authorId === effectiveUserId) {
return;
      }
applyCommentCreated(payload, effectiveUserId);
    },
[effectiveUserId],
  );

const handleCommentEdited = useCallback(
(payload: CommentEditedPayload) => {

if (effectiveUserId && payload.authorId === effectiveUserId) {
return;
      }
applyCommentEdited(payload, effectiveUserId);
    },
[effectiveUserId],
  );

const handleCommentDeleted = useCallback(
(payload: CommentDeletedPayload) => {

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

if (effectiveUserId && payload.voterId === effectiveUserId) {
return;
      }
applyVoteCast(payload, effectiveUserId);
    },
[effectiveUserId],
  );

const handleVoteRemoved = useCallback(
(payload: VoteRemovedPayload) => {

if (effectiveUserId && payload.voterId === effectiveUserId) {
return;
      }
applyVoteRemoved(payload, effectiveUserId);
    },
[effectiveUserId],
  );

useEffect(() => {
if (!socket || !enabled || connectionState !== "connected") {
return;
    }

const handleCommentEvent = (data: unknown) => {
if (!data || typeof data !== "object") return;
const payload = data as CommentEventPayload;

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
