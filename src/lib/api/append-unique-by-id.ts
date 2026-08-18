

export function appendUniqueById<T extends { id: string }>(
prev: readonly T[],
next: readonly T[]
): T[] {
const seen = new Set<string>()
const out: T[] = []

for (const item of prev) {
if (!seen.has(item.id)) {
seen.add(item.id)
out.push(item)
    }
  }

for (const item of next) {
if (!seen.has(item.id)) {
seen.add(item.id)
out.push(item)
    }
  }

return out
}
