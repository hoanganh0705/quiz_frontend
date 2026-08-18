

export const FORMATTED_TAG_DATE_PLACEHOLDER = '—'

export function formatTagDate(
d: string | null | undefined,
locale = 'en-US',
): string {
if (!d || typeof d !== 'string') {
return FORMATTED_TAG_DATE_PLACEHOLDER
  }
const parsed = new Date(d)
if (Number.isNaN(parsed.getTime())) {
return FORMATTED_TAG_DATE_PLACEHOLDER
  }
return new Intl.DateTimeFormat(locale, {
year: 'numeric',
month: 'short',
day: 'numeric',
  }).format(parsed)
}
