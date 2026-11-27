// Deterministic fallback gradients & initials for entity cards (quizzes, categories).
// Pure functions of `id` so SSR and CSR render identically.

const ENTITY_CARD_GRADIENT_TOKENS: ReadonlyArray<{
  from: string;
  to: string;
}> = [
  { from: "var(--card-gradient-1-from)", to: "var(--card-gradient-1-to)" },
  { from: "var(--card-gradient-2-from)", to: "var(--card-gradient-2-to)" },
  { from: "var(--card-gradient-3-from)", to: "var(--card-gradient-3-to)" },
  { from: "var(--card-gradient-4-from)", to: "var(--card-gradient-4-to)" },
  { from: "var(--card-gradient-5-from)", to: "var(--card-gradient-5-to)" },
  { from: "var(--card-gradient-6-from)", to: "var(--card-gradient-6-to)" },
];

export const ENTITY_CARD_GRADIENTS: readonly string[] =
  ENTITY_CARD_GRADIENT_TOKENS.map(
    ({ from, to }) => `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
  );

export function gradientFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const idx = hash % ENTITY_CARD_GRADIENTS.length;
  return ENTITY_CARD_GRADIENTS[idx]!;
}

const INITIAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function initialsFromId(id: string): string {
  const seed = id.replace(/-/g, "").slice(-6);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const a = INITIAL_CHARS[hash % INITIAL_CHARS.length];
  const b = INITIAL_CHARS[(hash >>> 8) % INITIAL_CHARS.length];
  return `${a}${b}`;
}
