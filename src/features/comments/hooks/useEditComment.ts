

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import { editComment } from '@/features/comments/services/comments.service';

export interface UseEditCommentOptions {

onSuccess?: () => void;

onError?: (error: ApiError) => void;
}

export interface UseEditCommentResult {

editComment: (payload: { body: string }) => Promise<boolean>;

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

export function useEditComment(
commentId: string,
options: UseEditCommentOptions = {},
): UseEditCommentResult {
const { onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const inFlightRef = useRef<Promise<boolean> | null>(null);

const errorCopy = error ? getUserCopy(error.code) : null;

const handleEdit = useCallback(
async ({ body }: { body: string }): Promise<boolean> => {
if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsLoading(true);
setError(null);

const startedAt = Date.now();

const core = (async (): Promise<boolean> => {
try {
await editComment(commentId, { body });

await globalMutate(
(key: readonly unknown[]) => Array.isArray(key) && key[0] === 'comments',
undefined,
{ revalidate: true },
          );

emitBreadcrumb('phase4:4.12:edit-comment', {
status: 'success',
durationMs: Date.now() - startedAt,
          });

onSuccess?.();
return true;
        } catch (err) {
if (isApiError(err)) {
setError(err);
onError?.(err);

emitBreadcrumb('phase4:4.12:edit-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
            });
return false;
          }

emitBreadcrumb('phase4:4.12:edit-comment', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
          });
logger.warn('comments.edit', 'unexpected rejection', err);
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
[commentId, onSuccess, onError],
  );

const resetError = useCallback(() => {
setError(null);
  }, []);

return {
editComment: handleEdit,
isLoading,
error,
errorCopy,
resetError,
  };
}
