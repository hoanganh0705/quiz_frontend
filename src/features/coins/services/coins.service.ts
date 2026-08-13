import * as Sentry from "@sentry/nextjs";
import type { AxiosRequestConfig } from "axios";

import { customInstance } from "@/lib/api";
import { ApiError } from "@/lib/api/core/ApiError";

// ─── Wire DTOs (mirror backend DTOs until SDK regenerates) ─────────────────

/** Mirrors `UserWalletResponseDto` (`src/modules/coins/dto/response/`). */
export interface CoinWallet {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastEarnedAt: string | null;
  lastSpentAt: string | null;
  updatedAt: string;
}

/** Mirrors `CoinTransactionDto`. */
export interface CoinTransaction {
  transactionId: string;
  userId: string;
  reason: string;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** Mirrors `CoinSpendResponseDto` (tip / flair / suppress / admin-adjust). */
export interface CoinSpendResponse {
  transactionId: string;
  balance: number;
  createdAt: string;
  amount: number;
}

/** Cursor-paginated ledger response — matches `GetCoinTransactions200`. */
export interface CoinTransactionPage {
  items: readonly CoinTransaction[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

// ─── Request DTOs (mirror backend request DTOs) ─────────────────────────────

export interface TipAuthorRequest {
  recipientUserId: string;
  quizId?: string;
  message?: string;
}

export interface PurchaseFlairRequest {
  userBadgeId: string;
}

export interface SuppressQuizRequest {
  quizId: string;
}

export interface AdminAdjustRequest {
  userId: string;
  /** Signed amount. Negative is a debit. */
  amount: number;
  reason: string;
  idempotencyKey?: string;
}

// ─── Service helpers ────────────────────────────────────────────────────────

const IDEMPOTENCY_HEADER = "Idempotency-Key";

/**
 * Internal: call `customInstance` directly with the right envelope
 * handling. Returned shape matches `orvalCustomInstance<T>` callers.
 */
async function callCoins<T>(config: AxiosRequestConfig): Promise<T> {
  // customInstance is the axios instance, NOT the orval mutator. The
  // response shape is `{ data, status, headers, … }` — `response.data`
  // is the wire body. For backend endpoints that return
  // `{ data: …, meta: { pagination: … } }`, the caller reads
  // `response.data` (the wrapped envelope) directly.
  const response = await customInstance.request<T>(config);
  return response.data as T;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/users/me/wallet`
 *
 * Returns the cached balance + lifetime counters. The hook layer caches
 * the result under `COIN_CACHE_KEYS.wallet()`; `useCoinSocket`
 * invalidates that key on every `coin:balance_changed`.
 *
 * Note: the URL piggybacks on the `/users/me/*` prefix because that is
 * the established convention for `me/*` reads (the controller is
 * `CoinController` mounted under `@Controller()` with no prefix, and
 * the global Nest prefix is `api/v1`). The `/coins/*` prefix is
 * reserved for the spend-side POST endpoints.
 */
export async function getCoinWallet(): Promise<CoinWallet> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.getCoinWallet",
  });
  const envelope = await callCoins<{ data?: CoinWallet; meta?: unknown }>({
    method: "GET",
    url: "/api/v1/users/me/wallet",
  });
  if (!envelope.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Coin wallet response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return envelope.data;
}

/**
 * `GET /api/v1/users/me/coin-transactions?cursor=&limit=`
 *
 * Cursor-paginated ledger. The returned page shape matches the
 * `useCursorPaginated` primitive.
 */
export async function listCoinTransactions(params: {
  cursor?: string;
  limit?: number;
}): Promise<CoinTransactionPage> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.listCoinTransactions",
  });

  const envelope = await callCoins<{
    data?: CoinTransaction[];
    meta?: {
      pagination?: {
        nextCursor: string | null;
        hasNextPage: boolean;
        limit: number;
      };
    };
  }>({
    method: "GET",
    url: "/api/v1/users/me/coin-transactions",
    params: {
      ...(params.cursor !== undefined ? { cursor: params.cursor } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  const items = envelope.data ?? [];
  const pagination = envelope.meta?.pagination;
  return {
    items,
    nextCursor: pagination?.nextCursor ?? null,
    hasNextPage: pagination?.hasNextPage ?? false,
    limit: pagination?.limit ?? params.limit ?? 25,
  };
}

// ─── Spend-side writes ──────────────────────────────────────────────────────

/**
 * `POST /api/v1/coins/tip`
 *
 * Send coins to a quiz author (or to another user in general). The
 * optional `idempotencyKey` is sent via the `Idempotency-Key` header;
 * the backend defaults to a deterministic key derived from the caller,
 * category, and reference.
 */
export async function tipUser(
  body: TipAuthorRequest,
  idempotencyKey?: string,
): Promise<CoinSpendResponse> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.tipUser",
    data: {
      recipientUserId: body.recipientUserId,
      quizId: body.quizId,
    },
  });

  const envelope = await callCoins<{ data?: CoinSpendResponse }>({
    method: "POST",
    url: "/api/v1/coins/tip",
    data: body,
    headers:
      idempotencyKey !== undefined
        ? { [IDEMPOTENCY_HEADER]: idempotencyKey }
        : undefined,
  });
  if (!envelope.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Tip response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return envelope.data;
}

/**
 * `POST /api/v1/coins/flair`
 *
 * Equip a badge as the viewer's profile flair for a configurable time
 * window. The backend writes a `user_flair_slots` row keyed to the
 * `coin_transaction_id`.
 */
export async function purchaseFlair(
  body: PurchaseFlairRequest,
  idempotencyKey?: string,
): Promise<CoinSpendResponse> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.purchaseFlair",
    data: { userBadgeId: body.userBadgeId },
  });
  const envelope = await callCoins<{ data?: CoinSpendResponse }>({
    method: "POST",
    url: "/api/v1/coins/flair",
    data: body,
    headers:
      idempotencyKey !== undefined
        ? { [IDEMPOTENCY_HEADER]: idempotencyKey }
        : undefined,
  });
  if (!envelope.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Flair purchase response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return envelope.data;
}

/**
 * `POST /api/v1/coins/suppress-recommended`
 *
 * Hide a quiz from the viewer's "Recommended for you" feed for a
 * configurable duration. The backend writes a `user_quiz_suppressions`
 * row keyed to the `coin_transaction_id`.
 */
export async function suppressRecommendedQuiz(
  body: SuppressQuizRequest,
  idempotencyKey?: string,
): Promise<CoinSpendResponse> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.suppressRecommendedQuiz",
    data: { quizId: body.quizId },
  });
  const envelope = await callCoins<{ data?: CoinSpendResponse }>({
    method: "POST",
    url: "/api/v1/coins/suppress-recommended",
    data: body,
    headers:
      idempotencyKey !== undefined
        ? { [IDEMPOTENCY_HEADER]: idempotencyKey }
        : undefined,
  });
  if (!envelope.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Suppress-quiz response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return envelope.data;
}

// ─── Admin ──────────────────────────────────────────────────────────────────

/**
 * `POST /api/v1/admin/coins/adjust`
 *
 * Admin-only. Credit or debit an arbitrary user's wallet with a
 * human-readable `reason` that lands in the `metadata.reason` field of
 * the ledger row. Always sent with an explicit `Idempotency-Key` —
 * either from the caller or a fresh UUID — so the audit log is exactly
 * one row per call.
 */
export async function adminAdjustCoins(
  body: AdminAdjustRequest,
  idempotencyKey?: string,
): Promise<CoinSpendResponse> {
  Sentry.addBreadcrumb({
    category: "phase7:service",
    message: "coins.adminAdjustCoins",
    data: { userId: body.userId, amount: body.amount },
  });

  const headerValue =
    idempotencyKey ??
    body.idempotencyKey ??
    (typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const envelope = await callCoins<{ data?: CoinSpendResponse }>({
    method: "POST",
    url: "/api/v1/admin/coins/adjust",
    data: { ...body },
    headers: { [IDEMPOTENCY_HEADER]: headerValue },
  });
  if (!envelope.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Admin adjust response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return envelope.data;
}
