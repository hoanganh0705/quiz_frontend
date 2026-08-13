/**
 * `coin.constants.ts` — client-side mirror of the backend coin constants.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.A1.
 *
 * Mirrors `src/modules/coins/domain/constants/coin.constants.ts` on the
 * backend. These values are display-only — the server is the
 * authoritative source for spend-side debits (every spend endpoint
 * re-derives the cost from `COIN_SPEND_AMOUNTS`).
 *
 * If the backend value ever changes, the client can keep the older
 * value for the affordance label and the user will simply see the
 * actual charge after the mutation runs.
 */

export const COIN_SPEND_AMOUNTS = {
  /** `POST /coins/tip` — standard tip amount. */
  TIP_STANDARD: 25,
  /** `POST /coins/flair` — 7-day profile flair slot. */
  FLAIR_7_DAY: 100,
  /** `POST /coins/suppress-recommended` — 14-day quiz hide. */
  SUPPRESS_RECOMMENDED_14_DAY: 50,
} as const;

export type CoinSpendAmountKey = keyof typeof COIN_SPEND_AMOUNTS;

/**
 * Daily-tip cap (server-authoritative). Surfaced in the tip button's
 * tooltip when the user has hit the cap.
 */
export const COIN_DAILY_TIP_LIMIT = 10;