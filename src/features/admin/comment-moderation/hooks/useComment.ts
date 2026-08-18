'use client';

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError, getComments } from '@/lib/api';

import { commentIdKey, commentIdKeyMatcher } from './commentIdKeys';
import { validateCommentId } from '../comment-id-validation';

export interface UseCommentParams {

commentId: string;

enabled?: boolean;
}

export interface UseCommentResult {
comment: unknown | null;
isLoading: boolean;
error: ApiError | null;
outcome: 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted';
refresh: () => Promise<unknown>;
mutate: (next: unknown | ((prev: unknown | null) => unknown)) => Promise<unknown>;
}

function makeNotFoundError(): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'COMMENT_NOT_FOUND',
config: undefined,
request: undefined,
response: {
status: 404,
data: {
status: 404,
detail: 'COMMENT_NOT_FOUND',
title: 'COMMENT_NOT_FOUND',
extensions: {
code: 'COMMENT_NOT_FOUND',
requestId: 'client-validation',
        },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

function classifyError(apiError: ApiError): UseCommentResult['outcome'] {
const code = apiError.code;
if (code === 'COMMENT_NOT_FOUND') return 'not-found';
if (code === 'GLOBAL_FORBIDDEN') return 'forbidden';
return 'reverted';
}

export function useComment(params: UseCommentParams): UseCommentResult {
const { commentId, enabled = true } = params;

const isValid = useMemo(
() => validateCommentId(commentId).ok,
[commentId],
  );

const key = useMemo<readonly unknown[] | null>(() => {
if (!enabled) return null;
if (!isValid) return null;
return commentIdKey(commentId);
  }, [enabled, isValid, commentId]);

const fetcher = useCallback(async (id: string): Promise<unknown> => {
const sdk = getComments();
return sdk.getComment(id);
  }, []);

const swr = useSWR<unknown, ApiError>(
key,
async () => {
if (!isValid) {
throw makeNotFoundError();
      }
return fetcher(commentId);
    },
{
revalidateOnFocus: false,
keepPreviousData: true,
    },
  );

const outcome: UseCommentResult['outcome'] = useMemo(() => {

if (!isValid) return 'not-found';
if (!enabled) return 'pending';
if (!swr.error) {
return swr.data === undefined ? 'pending' : 'success';
    }
return classifyError(swr.error);
  }, [isValid, enabled, swr.error, swr.data]);

const refresh = useCallback(async () => {
if (!isValid) return makeNotFoundError();
const sdk = getComments();
const next = await sdk.getComment(commentId);

await swr.mutate(next as never);
return next;
  }, [isValid, commentId, swr]);

const mutate = useCallback(
async (
next: unknown | ((prev: unknown | null) => unknown),
    ): Promise<unknown> => {
return swr.mutate(next as never) as Promise<unknown>;
    },
[swr],
  );

return {
comment: swr.data ?? null,
isLoading: swr.isLoading,
error: swr.error ?? null,
outcome,
refresh,
mutate,
  };
}

export { commentIdKeyMatcher };
