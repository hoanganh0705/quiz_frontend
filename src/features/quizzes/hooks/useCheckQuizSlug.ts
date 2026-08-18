

'use client';

import { useCallback, useRef, useState } from 'react';

import { getQuizzes } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import { isApiError } from '@/lib/api';

const CHECK_DEBOUNCE_MS = 400;

export interface UseCheckQuizSlugReturn {

available: boolean | null;

isChecking: boolean;

error: string | null;

check: (slug: string) => void;

reset: () => void;
}

function isNotFoundError(err: unknown): boolean {
return isApiError(err) && err.status === 404;
}

export function useCheckQuizSlug(): UseCheckQuizSlugReturn {
const [available, setAvailable] = useState<boolean | null>(null);
const [isChecking, setIsChecking] = useState(false);
const [error, setError] = useState<string | null>(null);

const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const abortRef = useRef<AbortController | null>(null);

const check = useCallback((slug: string) => {

if (!slug || slug.trim() === '') {

abortRef.current?.abort();
abortRef.current = null;

setAvailable(null);
setIsChecking(false);
setError(null);
return;
    }

if (timerRef.current !== null) {
clearTimeout(timerRef.current);
    }

abortRef.current?.abort();

timerRef.current = setTimeout(async () => {
setIsChecking(true);
setError(null);

const controller = new AbortController();
abortRef.current = controller;

try {
await getQuizzes().quizControllerGetQuizById(slug);

setAvailable(false);
      } catch (err) {
if (controller.signal.aborted) {

return;
        }
if (isNotFoundError(err)) {

setAvailable(true);
        } else if (isApiError(err)) {

setAvailable(false);
setError(
err.detail ?? err.message ?? 'Could not check slug availability.',
          );
        } else {

setAvailable(false);
setError('Could not check slug availability.');
        }
      } finally {
setIsChecking(false);
abortRef.current = null;
      }
    }, CHECK_DEBOUNCE_MS);
  }, []);

const reset = useCallback(() => {
if (timerRef.current !== null) {
clearTimeout(timerRef.current);
timerRef.current = null;
    }
abortRef.current?.abort();
abortRef.current = null;
setAvailable(null);
setIsChecking(false);
setError(null);
  }, []);

return { available, isChecking, error, check, reset };
}
