

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import {
unvoteComment,
voteComment,
} from '@/features/comments/services/comments.service';
import type { CommentVoteDirection, CommentUserVote } from '@/features/comments/types';

export interface UseVoteCommentOptions {

onSuccess?: (nextVote: CommentUserVote) => void;

onError?: (error: ApiError) => void;
}

export interface UseVoteCommentResult {

vote: (direction: CommentVoteDirection) => Promise<CommentUserVote | null>;

unvote: () => Promise<CommentUserVote | null>;

toggleVote: (
direction: CommentVoteDirection,
currentVote?: CommentUserVote,
  ) => Promise<CommentUserVote | null>;

isLoading: boolean;

error: ApiError | null;

errorCopy: UserCopyEntry | null;

resetError: () => void;
}

function emitBreadcrumb(
category: string,
data: { status: string; durationMs: number; code?: string },
): void {

void category;
void data;
}

const COOLDOWN_MS = 500;

function nextVoteForToggle(
direction: CommentVoteDirection,
currentVote: CommentUserVote,
): CommentUserVote {
if (currentVote === direction) {

return null;
  }

return direction;
}

export function useVoteComment(
commentId: string,
options: UseVoteCommentOptions = {},
): UseVoteCommentResult {
const { onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const inFlightRef = useRef<Promise<CommentUserVote | null> | null>(null);
const lastInvocationRef = useRef<number>(0);

const errorCopy = error ? getUserCopy(error.code) : null;

const runWithOptimistic = useCallback(
async (
patcher: (current: unknown) => unknown,
run: () => Promise<unknown>,
nextUserVote: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
if (inFlightRef.current) {
return inFlightRef.current;
      }

const now =
typeof performance !== 'undefined' ? performance.now() : Date.now();
if (now - lastInvocationRef.current < COOLDOWN_MS) {
return null;
      }
lastInvocationRef.current = now;

setIsLoading(true);
setError(null);

const startedAt = Date.now();

const allCommentsKeys = await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'comments',
      );
const snapshotMap = (allCommentsKeys ?? {}) as Record<string, unknown>;

const apply = async () => {
await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'comments',
(current: unknown) => {
const entry = current as { items?: unknown[] } | undefined;
if (!entry?.items) return current;
return {
...entry,
items: entry.items.map((it) => patcher(it)),
            };
          },
{ revalidate: false },
        );
      };
void apply;

const core = (async (): Promise<CommentUserVote | null> => {
try {
await run();

await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'comments',
undefined,
{ revalidate: true },
          );

emitBreadcrumb('phase4:4.12:vote-comment', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

onSuccess?.(nextUserVote);
return nextUserVote;
        } catch (err) {

await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'comments',
(current: unknown) => {

if (
typeof current === 'object' &&
current !== null &&
'id' in current &&
typeof (current as { id: unknown }).id === 'string' &&
snapshotMap[(current as { id: string }).id] !== undefined
              ) {
return snapshotMap[(current as { id: string }).id];
              }
return current;
            },
{ revalidate: false },
          );

if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.12:vote-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });
return null;
          }

emitBreadcrumb('phase4:4.12:vote-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
          });
logger.warn('comments.vote', 'unexpected rejection', err);
return null;
        }
      })();

inFlightRef.current = core;
try {
return await core;
      } finally {
setIsLoading(false);
inFlightRef.current = null;
      }
    },
[onSuccess, onError],
  );

const patcher = useCallback(
(direction: CommentVoteDirection, nextUserVote: CommentUserVote) =>
(item: unknown): unknown => {
if (
typeof item !== 'object' ||
item === null ||
(item as { id?: unknown }).id !== commentId
        ) {
return item;
        }
const c = item as {
upvotesCount: number;
downvotesCount: number;
votesCount: number;
userVote: CommentUserVote;
        };

const prevVote: CommentUserVote = c.userVote ?? null;
let upvotesDelta = 0;
let downvotesDelta = 0;
if (prevVote === 'upvote') upvotesDelta -= 1;
if (prevVote === 'downvote') downvotesDelta -= 1;
if (nextUserVote === 'upvote') upvotesDelta += 1;
if (nextUserVote === 'downvote') downvotesDelta += 1;

return {
...c,
upvotesCount: c.upvotesCount + upvotesDelta,
downvotesCount: c.downvotesCount + downvotesDelta,
votesCount: c.votesCount + upvotesDelta + downvotesDelta,
userVote: nextUserVote,
        };
      },
[commentId],
  );

const vote = useCallback(
async (direction: CommentVoteDirection): Promise<CommentUserVote | null> => {
return runWithOptimistic(
patcher(direction, direction),
() => voteComment(commentId, { value: direction }),
direction,
      );
    },
[commentId, patcher, runWithOptimistic],
  );

const unvote = useCallback(async (): Promise<CommentUserVote | null> => {
return runWithOptimistic(
patcher('upvote', null),
() => unvoteComment(commentId),
null,
    );
  }, [commentId, patcher, runWithOptimistic]);

const toggleVote = useCallback(
async (
direction: CommentVoteDirection,
currentVote?: CommentUserVote,
    ): Promise<CommentUserVote | null> => {
const actualCurrent: CommentUserVote = currentVote ?? null;
const next = nextVoteForToggle(direction, actualCurrent);
if (next === null) {
return unvote();
      }
if (next !== direction) {

return null;
      }
return vote(direction);
    },
[vote, unvote],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return {
vote,
unvote,
toggleVote,
isLoading,
error,
errorCopy,
resetError,
  };
}
