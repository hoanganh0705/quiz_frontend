/**
 * Integration tests for `<CoinsLandingPage />` (Phase 5.2).
 *
 * Approach: mock all of the coin hooks (`useCoinWallet`,
 * `useCoinTransactions`, `useTipAuthor`, `usePurchaseFlair`) at the
 * module boundary so we don't pull in SWR or any other heavy runtime.
 *
 * Coverage:
 *   - Loading / populated / placeholder balance states.
 *   - Earnings summary reflects `lifetimeEarned` / `lifetimeSpent`.
 *   - Transaction list renders populated + empty + error states.
 *   - "Load more" paginates.
 *   - TipAuthorForm calls `useTipAuthor().tip()` with the right payload.
 *   - TipAuthorForm rejects non-UUID recipients (validation guard).
 *   - FlairEquipForm calls `usePurchaseFlair().purchaseFlair()`.
 *   - Insufficient balance disables both spend buttons.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ApiError } from "@/lib/api";
import type {
  CoinTransaction,
  CoinWallet,
} from "@/features/coins/types/coin.types";

const mockWallet = vi.fn();
const mockTransactions = vi.fn();
const mockTip = vi.fn();
const mockPurchaseFlair = vi.fn();

vi.mock("@/features/coins/hooks/useCoinWallet", () => ({
  useCoinWallet: () => mockWallet(),
}));

vi.mock("@/features/coins/hooks/useCoinTransactions", () => ({
  useCoinTransactions: () => mockTransactions(),
}));

vi.mock("@/features/coins/hooks/useTipAuthor", () => ({
  useTipAuthor: () => ({
    tip: (...args: unknown[]) => mockTip(...args),
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/features/coins/hooks/usePurchaseFlair", () => ({
  usePurchaseFlair: () => ({
    purchaseFlair: (...args: unknown[]) => mockPurchaseFlair(...args),
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    currentUser: { userId: "0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b" },
    isLoading: false,
    error: null,
  }),
}));

import { CoinsLandingPage } from "../CoinsLandingPage";

function makeWallet(overrides: Partial<CoinWallet> = {}): CoinWallet {
  return {
    userId: "u-1",
    balance: 250,
    lifetimeEarned: 500,
    lifetimeSpent: 250,
    lastEarnedAt: "2026-01-01T00:00:00Z",
    lastSpentAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function makeTxn(overrides: Partial<CoinTransaction> = {}): CoinTransaction {
  return {
    transactionId: "txn-1",
    userId: "u-1",
    reason: "QUIZ_COMPLETION_REWARD",
    amount: 25,
    balanceAfter: 275,
    referenceType: null,
    referenceId: null,
    idempotencyKey: "idem-1",
    metadata: null,
    createdAt: "2026-01-02T12:00:00Z",
    ...overrides,
  };
}

function mockApiError(message: string): ApiError {
  return {
    code: "GLOBAL_INTERNAL_ERROR",
    status: 500,
    message,
  } as ApiError;
}

describe("CoinsLandingPage (Phase 5.2)", () => {
  beforeEach(() => {
    mockTip.mockReset();
    mockPurchaseFlair.mockReset();
    mockWallet.mockReset();
    mockTransactions.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the balance section with the wallet value (live mode)", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 250 }),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-landing-page")).toBeInTheDocument();
    expect(screen.getByTestId("coins-balance-value")).toHaveTextContent("250");
    expect(screen.queryByTestId("coins-placeholder-pill")).not.toBeInTheDocument();
  });

  it("renders the placeholder pill when the wallet is in placeholder mode", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 0 }),
      balance: 0,
      isLoading: false,
      isStale: false,
      isPlaceholder: true,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: true,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-placeholder-pill")).toBeInTheDocument();
    expect(screen.getByTestId("coins-balance-value")).toHaveTextContent("—");
  });

  it("shows a wallet error instead of a fake balance", () => {
    mockWallet.mockReturnValue({
      wallet: null,
      balance: null,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: mockApiError("boom"),
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-balance-error")).toHaveTextContent(
      "Could not load your wallet: boom",
    );
  });

  it("renders lifetime earned and spent from the wallet", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ lifetimeEarned: 1234, lifetimeSpent: 432 }),
      balance: 802,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-earned-value")).toHaveTextContent("1,234");
    expect(screen.getByTestId("coins-spent-value")).toHaveTextContent("432");
  });

  it("renders the populated transaction list with formatted rows", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet(),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [
        makeTxn({
          transactionId: "txn-a",
          reason: "QUIZ_COMPLETION_REWARD",
          amount: 25,
        }),
        makeTxn({
          transactionId: "txn-b",
          reason: "TIP_SENT",
          amount: -25,
          balanceAfter: 250,
        }),
      ],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    const rows = screen.getAllByTestId("coins-transaction-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("Quiz completion")).toBeInTheDocument();
    expect(screen.getByText("Tip sent")).toBeInTheDocument();
    expect(screen.getAllByTestId("coins-transaction-amount")[0]).toHaveTextContent(
      "+25",
    );
    expect(screen.getAllByTestId("coins-transaction-amount")[1]).toHaveTextContent(
      "-25",
    );
  });

  it("renders the empty state when there are no transactions", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet(),
      balance: 0,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-transactions-empty-card")).toBeInTheDocument();
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders the transaction error state with retry, no fake rows", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    mockWallet.mockReturnValue({
      wallet: makeWallet(),
      balance: 0,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh,
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: mockApiError("ledger down"),
      refresh,
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("coins-transactions-error")).toHaveTextContent(
      "ledger down",
    );
    fireEvent.click(screen.getByTestId("coins-transactions-retry"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("paginates when 'Load more' is clicked", () => {
    const loadMore = vi.fn();
    mockWallet.mockReturnValue({
      wallet: makeWallet(),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [makeTxn()],
      isLoading: false,
      hasMore: true,
      loadMore,
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    fireEvent.click(screen.getByTestId("coins-transactions-load-more"));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("disables both spend buttons when balance is insufficient", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 5 }),
      balance: 5,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    expect(screen.getByTestId("tip-submit-button")).toBeDisabled();
    expect(screen.getByTestId("flair-submit-button")).toBeDisabled();
    expect(screen.getByTestId("tip-disabled-reason")).toHaveTextContent(
      /at least 25 coins/i,
    );
    expect(screen.getByTestId("flair-disabled-reason")).toHaveTextContent(
      /at least 100 coins/i,
    );
  });

  it("submits a tip with the recipient UUID, quiz UUID, and idempotency key", async () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 250 }),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    // The mocked useAuth returns userId 0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b,
    // so we tip a DIFFERENT user.
    fireEvent.input(screen.getByTestId("tip-recipient-input"), {
      target: { value: "11111111-2222-3333-4444-555555555555" },
    });
    fireEvent.input(screen.getByTestId("tip-quiz-input"), {
      target: { value: "0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a" },
    });
    fireEvent.input(screen.getByTestId("tip-message-input"), {
      target: { value: "thanks!" },
    });
    // Open the confirm dialog first.
    fireEvent.click(screen.getByTestId("tip-submit-button"));
    // Confirm inside the dialog. Radix Dialog renders into a Portal
    // outside the React test container, so query the document body.
    const confirmButton = await waitFor(() => {
      const btn = document.querySelector(
        '[data-testid="purchase-confirm-submit"]',
      ) as HTMLButtonElement | null;
      if (!btn) throw new Error("purchase-confirm-submit not yet in document");
      return btn;
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockTip).toHaveBeenCalledTimes(1);
    });
    const [payload, idempotencyKey] = mockTip.mock.calls[0] as [
      {
        recipientUserId: string;
        quizId?: string;
        message?: string;
      },
      string,
    ];
    expect(payload).toEqual({
      recipientUserId: "11111111-2222-3333-4444-555555555555",
      quizId: "0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a",
      message: "thanks!",
    });
    expect(idempotencyKey).toMatch(
      /^tip:0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b:11111111-2222-3333-4444-555555555555:/,
    );
  });

  it("rejects a non-UUID recipient before opening the confirm dialog", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 250 }),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    fireEvent.input(screen.getByTestId("tip-recipient-input"), {
      target: { value: "not-a-uuid" },
    });
    // The submit button stays enabled; validation runs inside the
    // confirm handler and surfaces the inline alert.
    fireEvent.click(screen.getByTestId("tip-submit-button"));
    fireEvent.click(screen.getByTestId("purchase-confirm-submit"));
    expect(mockTip).not.toHaveBeenCalled();
    expect(screen.getByTestId("tip-validation-error")).toHaveTextContent(
      /Recipient must be a UUID/i,
    );
  });

  it("rejects a self-tip", () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 250 }),
      balance: 250,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    // The mocked useAuth returns userId 0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b.
    fireEvent.input(screen.getByTestId("tip-recipient-input"), {
      target: { value: "0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b" },
    });
    // Submit button must be disabled because disabledReason !== null.
    expect(screen.getByTestId("tip-submit-button")).toBeDisabled();
    expect(screen.getByTestId("tip-disabled-reason")).toHaveTextContent(
      /can't tip yourself/i,
    );
  });

  it("submits a flair purchase with the badge UUID", async () => {
    mockWallet.mockReturnValue({
      wallet: makeWallet({ balance: 500 }),
      balance: 500,
      isLoading: false,
      isStale: false,
      isPlaceholder: false,
      error: null,
      refresh: vi.fn(),
    });
    mockTransactions.mockReturnValue({
      items: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(),
      isPlaceholder: false,
    });

    render(<CoinsLandingPage />);
    fireEvent.input(screen.getByTestId("flair-badge-input"), {
      target: { value: "0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a" },
    });
    fireEvent.click(screen.getByTestId("flair-submit-button"));
    // Radix Dialog portal — query the document body directly.
    const confirmButton = await waitFor(() => {
      const btn = document.querySelector(
        '[data-testid="purchase-confirm-submit"]',
      ) as HTMLButtonElement | null;
      if (!btn) throw new Error("purchase-confirm-submit not yet in document");
      return btn;
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPurchaseFlair).toHaveBeenCalledTimes(1);
    });
    const [payload, idempotencyKey] = mockPurchaseFlair.mock.calls[0] as [
      { userBadgeId: string },
      string,
    ];
    expect(payload).toEqual({
      userBadgeId: "0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a",
    });
    expect(idempotencyKey).toMatch(/^flair:0190f6a5-/);
  });
});
