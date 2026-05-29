/**
 * Custom API Error class that wraps Axios errors with typed properties.
 */

import type { AxiosError } from 'axios';

export interface ApiErrorData {
  statusCode: number;
  message: string | string[];
  error: string;
  requestId?: string;
  path?: string;
  method?: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly requestId?: string;
  public readonly path?: string;
  public readonly method?: string;
  public readonly isValidationError: boolean;
  public readonly validationMessages: string[];

  constructor(error: AxiosError<ApiErrorData>) {
    const data = error.response?.data;

    const validationMessages = Array.isArray(data?.message)
      ? (data?.message as string[])
      : [];

    const message =
      validationMessages.length > 0
        ? validationMessages.join(', ')
        : data?.message ?? error.message;

    super(message as string);

    this.name = 'ApiError';

    this.statusCode = data?.statusCode ?? error.response?.status ?? 0;
    this.error = data?.error ?? '';
    this.requestId = data?.requestId;
    this.path = data?.path;
    this.method = data?.method;

    this.isValidationError = validationMessages.length > 0;
    this.validationMessages = validationMessages;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  get isBadRequest(): boolean {
    return this.statusCode === 400;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isUnprocessableEntity(): boolean {
    return this.statusCode === 422;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}