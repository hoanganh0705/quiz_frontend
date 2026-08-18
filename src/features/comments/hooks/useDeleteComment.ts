

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import { deleteComment } from '@/features/comments/services/comments.service';

export interface UseDeleteCommentOptions {

parentId?: string | null;

onSuccess?: () => void;

onError?: (error: ApiError) => void;
}

export interface UseDeleteCommentResult {

deleteComment: () => Promise<boolean>;

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

export function useDeleteComment(
commentId: string,
options: UseDeleteCommentOptions = {},
): UseDeleteCommentResult {
const { parentId, onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const inFlightRef = useRef<Promise<boolean> | null>(null);

const errorCopy = error ? getUserCopy(error.code) : null;

const handleDelete = useCallback(
async (): Promise<boolean> => {
if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsLoading(true);
setError(null);

const startedAt = Date.now();

const core = (async (): Promise<boolean> => {
try {
await deleteComment(commentId);

if (parentId) {
await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) &&
key[0] === 'comments' &&
key[1] === 'thread',
(current: Readonly<Record<string, { repliesCount: number }>> | undefined) => {
const map = (current ?? {}) as Record<
string,
{ repliesCount: number }
                >;
const entry = map[parentId];
if (!entry) return current ?? {};
return {
...map,
[parentId]: {
...entry,
repliesCount: Math.max(0, entry.repliesCount - 1),
                  },
                };
              },
{ revalidate: false },
            );
          }

await globalMutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'comments',
undefined,
{ revalidate: true },
          );

emitBreadcrumb('phase4:4.12:delete-comment', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

onSuccess?.();
return true;
        } catch (err) {
if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.12:delete-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });
return false;
          }

emitBreadcrumb('phase4:4.12:delete-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
          });
logger.warn('comments.delete', 'unexpected rejection', err);
return false;
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
[commentId, parentId, onSuccess, onError],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return {
deleteComment: handleDelete,
isLoading,
error,
errorCopy,
resetError,
  };
}
