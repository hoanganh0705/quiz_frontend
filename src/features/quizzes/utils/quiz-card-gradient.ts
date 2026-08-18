// Card fallback gradients resolve through CSS custom properties so the
// theme can flip by editing --card-gradient-*-from / -to tokens in
// globals.css. The gradient itself stays opaque on top of bg-card.

const QUIZ_CARD_GRADIENT_TOKENS: ReadonlyArray<{
  from: string
  to: string
}> = [
  { from: 'var(--card-gradient-1-from)', to: 'var(--card-gradient-1-to)' },
  { from: 'var(--card-gradient-2-from)', to: 'var(--card-gradient-2-to)' },
  { from: 'var(--card-gradient-3-from)', to: 'var(--card-gradient-3-to)' },
  { from: 'var(--card-gradient-4-from)', to: 'var(--card-gradient-4-to)' },
  { from: 'var(--card-gradient-5-from)', to: 'var(--card-gradient-5-to)' },
  { from: 'var(--card-gradient-6-from)', to: 'var(--card-gradient-6-to)' }
]

export const QUIZ_CARD_GRADIENTS: readonly string[] =
  QUIZ_CARD_GRADIENT_TOKENS.map(
    ({ from, to }) =>
      `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
  )

export function gradientFromQuizId(quizId: string): string {
  let hash = 0
  for (let i = 0; i < quizId.length; i += 1) {
    hash = (hash * 31 + quizId.charCodeAt(i)) >>> 0
  }
  const idx = hash % QUIZ_CARD_GRADIENTS.length
  return QUIZ_CARD_GRADIENTS[idx]!
}
