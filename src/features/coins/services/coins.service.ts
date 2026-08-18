import * as Sentry from "@sentry/nextjs";
import type { AxiosRequestConfig } from "axios";

import { customInstance } from "@/lib/api";
import { ApiError } from "@/lib/api/core/ApiError";

export interface CoinWallet {
userId: string;
balance: number;
lifetimeEarned: number;
lifetimeSpent: number;
lastEarnedAt: string | null;
lastSpentAt: string | null;
updatedAt: string;
}

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

export interface CoinSpendResponse {
transactionId: string;
balance: number;
createdAt: string;
amount: number;
}

export interface CoinTransactionPage {
items: readonly CoinTransaction[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

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

amount: number;
reason: string;
idempotencyKey?: string;
}

const IDEMPOTENCY_HEADER = "Idempotency-Key";

async function callCoins<T>(config: AxiosRequestConfig): Promise<T> {

const response = await customInstance.request<T>(config);
return response.data as T;
}

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
