/**
 * Integration tests for `<CoinsLandingPage />`.
 *
 * Approach: mock coin hooks (`useCoinWallet`, `useCoinTransactions`) at the module boundary.
 *
 * Coverage:
 *   - Loading / populated / placeholder balance states.
 *   - Earnings summary reflects `lifetimeEarned` / `lifetimeSpent`.
 *   - Transaction list renders populated + empty + error states.
 *   - "Load more" paginates.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoinsLandingPage } from "../CoinsLandingPage";

import type {
  CoinTransaction,
  CoinWallet,
} from "@/features/coins/types/coin.types";
import type { ApiError } from "@/lib/api";

const mockWallet = vi.fn();
const mockTransactions = vi.fn();

vi.mock("@/features/coins/hooks/useCoinWallet", () => ({
  useCoinWallet: () => mockWallet(),
}));

vi.mock("@/features/coins/hooks/useCoinTransactions", () => ({
  useCoinTransactions: () => mockTransactions(),
}));

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

describe("CoinsLandingPage", () => {
  beforeEach(() => {
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
    expect(
      screen.queryByTestId("coins-placeholder-pill"),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getAllByTestId("coins-transaction-amount")[0],
    ).toHaveTextContent("+25");
    expect(
      screen.getAllByTestId("coins-transaction-amount")[1],
    ).toHaveTextContent("-25");
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
    expect(
      screen.getByTestId("coins-transactions-empty-card"),
    ).toBeInTheDocument();
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
});
