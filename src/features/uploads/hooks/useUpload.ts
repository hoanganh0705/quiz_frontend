'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { UploadFileRequest, UploadFileResponse } from '@/lib/api/generated/uploads';

export interface UseUploadOptions {
  /**
   * Maximum number of retries on transient failure (network error, 5xx).
   * Default is 1 — matches the backend plan's "retry-once" policy.
   */
  maxRetries?: number;
}

export interface UploadFailure extends Error {
  /** HTTP status code (0 when network error). */
  status: number;
  /** Stable application-level code, e.g. UPLOAD_HTTP_400, UPLOAD_NETWORK_ERROR. */
  code: string;
  /** Server response body when status >= 400. */
  body?: string;
}

export interface UseUploadReturn {
  /**
   * Upload a file. Resolves with the server's response on success.
   * Throws on permanent failure (after all retries are exhausted).
   */
  upload: (payload: UploadFileRequest) => Promise<UploadFileResponse>;
  /** True while an upload is in flight (including retries). */
  isUploading: boolean;
  /** 0-100 while uploading; null when not uploading. */
  progress: number | null;
  /** Last error from the last attempt, or null. */
  error: UploadFailure | null;
  /** Re-run the last failed attempt. No-op if no error is set. */
  retry: () => Promise<UploadFileResponse | null>;
  /** Reset transient state (error, progress) without retrying. */
  reset: () => void;
}

const NON_RETRYABLE_CODES = new Set<string>([
  'UPLOAD_ABORTED',
  'UPLOAD_HTTP_400',
  'UPLOAD_HTTP_401',
  'UPLOAD_HTTP_403',
  'UPLOAD_HTTP_413',
  'UPLOAD_HTTP_429',
  'UPLOAD_RESPONSE_MALFORMED',
]);

function makeFailure(status: number, code: string, message: string, body?: string): UploadFailure {
  const err = new Error(message) as UploadFailure;
  err.name = 'UploadFailure';
  err.status = status;
  err.code = code;
  if (body !== undefined) err.body = body;
  return err;
}

/**
 * React hook for uploading files via `POST /api/v1/uploads`.
 *
 * Uses `XMLHttpRequest` (not `fetch`) so we can report per-byte
 * progress. The Cloudinary SDK's `axios` path doesn't expose upload
 * progress because `axios` reports via `onUploadProgress` which is
 * not part of the project's `orvalCustomInstance` mutator signature.
 */
export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const maxRetries = options.maxRetries ?? 1;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<UploadFailure | null>(null);

  const lastPayloadRef = useRef<UploadFileRequest | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (xhrRef.current && xhrRef.current.readyState !== XMLHttpRequest.DONE) {
        xhrRef.current.abort();
      }
    };
  }, []);

  const runOnce = useCallback(
    (payload: UploadFileRequest): Promise<UploadFileResponse> => {
      return new Promise<UploadFileResponse>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('purpose', payload.purpose);

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open('POST', '/api/v1/uploads', true);

        xhr.upload.onprogress = (event: ProgressEvent) => {
          if (!mountedRef.current) return;
          if (event.lengthComputable && event.total > 0) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (!mountedRef.current) return;
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const body = JSON.parse(xhr.responseText) as UploadFileResponse;
              setProgress(100);
              resolve(body);
            } catch {
              reject(
                makeFailure(xhr.status, 'UPLOAD_RESPONSE_MALFORMED', 'Malformed upload response'),
              );
            }
            return;
          }
          reject(
            makeFailure(
              xhr.status,
              `UPLOAD_HTTP_${xhr.status}`,
              `Upload failed with HTTP ${xhr.status}`,
              xhr.responseText,
            ),
          );
        };

        xhr.onerror = () => {
          if (!mountedRef.current) return;
          reject(makeFailure(0, 'UPLOAD_NETWORK_ERROR', 'Network error during upload'));
        };

        xhr.onabort = () => {
          if (!mountedRef.current) return;
          reject(makeFailure(0, 'UPLOAD_ABORTED', 'Upload aborted'));
        };

        xhr.send(formData);
      });
    },
    [],
  );

  const upload = useCallback(
    async (payload: UploadFileRequest): Promise<UploadFileResponse> => {
      lastPayloadRef.current = payload;
      setIsUploading(true);
      setProgress(0);
      setError(null);

      let attempt = 0;
      let lastErr: UploadFailure | null = null;
      while (attempt <= maxRetries) {
        try {
          const result = await runOnce(payload);
          if (mountedRef.current) {
            setIsUploading(false);
            setProgress(null);
          }
          return result;
        } catch (err) {
          const failure = (err as UploadFailure).code
            ? (err as UploadFailure)
            : makeFailure(
                0,
                'UPLOAD_UNKNOWN',
                err instanceof Error ? err.message : 'Unknown upload error',
              );
          lastErr = failure;
          if (NON_RETRYABLE_CODES.has(failure.code)) {
            break;
          }
          if (attempt >= maxRetries) {
            break;
          }
          attempt += 1;
        }
      }

      if (mountedRef.current) {
        setIsUploading(false);
        setProgress(null);
        setError(lastErr);
      }
      throw lastErr;
    },
    [maxRetries, runOnce],
  );

  const retry = useCallback(async (): Promise<UploadFileResponse | null> => {
    const payload = lastPayloadRef.current;
    if (!payload) return null;
    try {
      return await upload(payload);
    } catch {
      return null;
    }
  }, [upload]);

  const reset = useCallback(() => {
    setError(null);
    setProgress(null);
    setIsUploading(false);
    lastPayloadRef.current = null;
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    retry,
    reset,
  };
}
