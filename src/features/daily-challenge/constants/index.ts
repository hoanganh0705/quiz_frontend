/**
 * `daily-challenge/constants/index.ts` — barrel for read-only constants.
 *
 * History:
 *   - The `streak-rewards` barrel entry was removed in Phase 8 of
 *     the coin-economy design (see `QUIZ_COIN_ECONOMY_DESIGN.md`
 *     line 990): the `streakRewards` hardcoded reward labels
 *     (`+50 Coins`, `+100 Coins`, etc.) were promise language with
 *     no backend support — the coin economy is now live via the
 *     `dailyChallengeControllerGetToday` response's
 *     `rewardXp` field, which the streak-rewards card pulls
 *     from `useDailyChallengeStreakView` / `useDailyChallengeToday`.
 */

export * from './performance-data';
