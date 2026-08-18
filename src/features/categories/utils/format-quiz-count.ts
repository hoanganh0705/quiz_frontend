

export const FORMATTED_QUIZ_COUNT_PLACEHOLDER = '—'

export function formatQuizCount(
n: number | null | undefined,
locale = 'en-US',
): string {
if (n === null || n === undefined || !Number.isFinite(n)) {
return FORMATTED_QUIZ_COUNT_PLACEHOLDER
  }
if (n < 0) {

return FORMATTED_QUIZ_COUNT_PLACEHOLDER
  }

if (n < 1_500) {
return new Intl.NumberFormat(locale, {
useGrouping: true,
    }).format(Math.trunc(n))
  }

const suffixes = ['', 'K', 'M', 'B', 'T']
const tier = Math.min(
Math.floor(Math.log10(n) / 3),
suffixes.length - 1,
  )
const scaled = n / Math.pow(1_000, tier)
const rounded = Math.round(scaled * 10) / 10

const stripped = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1))
return `${stripped}${suffixes[tier]}`
}
