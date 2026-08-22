// Card decoration helpers — deterministic, presentation-only.
//
// Centralised so that every card primitive (rail, grid, directory) renders
// the same fallback initials + gradient for the same id. The outputs are
// pure functions of the id so SSR + CSR match and the snapshot tests
// stay stable.

const INITIAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Two-character deterministic initials derived from a quiz id.
 * Used as the fallback cover for the `<EntityCard />` primitive when
 * `imageUrl` is missing.
 */
export function initialsFromQuizId(quizId: string): string {
  const seed = quizId.replace(/-/g, "").slice(-6);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const a = INITIAL_CHARS[hash % INITIAL_CHARS.length];
  const b = INITIAL_CHARS[(hash >>> 8) % INITIAL_CHARS.length];
  return `${a}${b}`;
}