/**
 * Unit tests for refresh error mapper.
 *
 * Source epic: Epic 2.7 — Access-token refresh and cross-tab session synchronization.
 * Source ticket: 2.7.T20.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyRefreshError,
  isTerminalRefreshError,
  isRetryableRefreshError,
  type RefreshErrorInput,
} from '../refresh-error-mapper';

describe('classifyRefreshError', () => {
  describe('terminal errors', () => {
    it('AUTH_TOKEN_REUSED → terminal', () => {
      const error: RefreshErrorInput = {
        code: 'AUTH_TOKEN_REUSED',
        status: 401,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('terminal');
      expect(result.reason).toBe('token_reused');
    });

    it('AUTH_SESSION_CONTEXT_MISMATCH → terminal', () => {
      const error: RefreshErrorInput = {
        code: 'AUTH_SESSION_CONTEXT_MISMATCH',
        status: 401,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('terminal');
      expect(result.reason).toBe('session_context_mismatch');
    });

    it('AUTH_INVALID_REFRESH_TOKEN → terminal', () => {
      const error: RefreshErrorInput = {
        code: 'AUTH_INVALID_REFRESH_TOKEN',
        status: 401,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('terminal');
      expect(result.reason).toBe('invalid_refresh_token');
    });

    it('401 with unrecognized code → terminal (no_refresh_token)', () => {
      const error: RefreshErrorInput = {
        code: 'SOME_OTHER_ERROR',
        status: 401,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('terminal');
      expect(result.reason).toBe('no_refresh_token');
    });

    it('401 with empty code → terminal', () => {
      const error: RefreshErrorInput = {
        code: '',
        status: 401,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('terminal');
      expect(result.reason).toBe('no_refresh_token');
    });
  });

  describe('retryable errors', () => {
    it('network error (status 0) → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'NETWORK_ERROR',
        status: 0,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('network_error');
    });

    it('500 server error → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('server_error');
    });

    it('502 server error → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'BAD_GATEWAY',
        status: 502,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('server_error');
    });

    it('503 server error → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('server_error');
    });

    it('504 server error → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'GATEWAY_TIMEOUT',
        status: 504,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('server_error');
    });

    it('599 server error → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'SOME_5XX',
        status: 599,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('server_error');
    });

    it('429 rate limited → retryable', () => {
      const error: RefreshErrorInput = {
        code: 'TOO_MANY_REQUESTS',
        status: 429,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('rate_limited');
    });
  });

  describe('fallback behavior', () => {
    it('400 bad request → retryable (unknown)', () => {
      const error: RefreshErrorInput = {
        code: 'VALIDATION_FAILED',
        status: 400,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('unknown');
    });

    it('403 forbidden → retryable (unknown)', () => {
      const error: RefreshErrorInput = {
        code: 'FORBIDDEN',
        status: 403,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('unknown');
    });

    it('404 not found → retryable (unknown)', () => {
      const error: RefreshErrorInput = {
        code: 'NOT_FOUND',
        status: 404,
      };

      const result = classifyRefreshError(error);

      expect(result.kind).toBe('retryable');
      expect(result.reason).toBe('unknown');
    });
  });
});

describe('isTerminalRefreshError', () => {
  it('returns true for terminal classification', () => {
    const classification = { kind: 'terminal' as const, reason: 'token_reused' };

    expect(isTerminalRefreshError(classification)).toBe(true);
  });

  it('returns false for retryable classification', () => {
    const classification = { kind: 'retryable' as const, reason: 'network_error' };

    expect(isTerminalRefreshError(classification)).toBe(false);
  });
});

describe('isRetryableRefreshError', () => {
  it('returns true for retryable classification', () => {
    const classification = { kind: 'retryable' as const, reason: 'network_error' };

    expect(isRetryableRefreshError(classification)).toBe(true);
  });

  it('returns false for terminal classification', () => {
    const classification = { kind: 'terminal' as const, reason: 'token_reused' };

    expect(isRetryableRefreshError(classification)).toBe(false);
  });
});
