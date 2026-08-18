

export const COIN_SPEND_AMOUNTS = {

TIP_STANDARD: 25,

FLAIR_7_DAY: 100,

SUPPRESS_RECOMMENDED_14_DAY: 50,
} as const;

export type CoinSpendAmountKey = keyof typeof COIN_SPEND_AMOUNTS;

export const COIN_DAILY_TIP_LIMIT = 10;