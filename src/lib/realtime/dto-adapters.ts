

export function normalizeArray<T>(input: T[] | null | undefined): T[] {
if (!input) return [];
return input;
}

export interface CursorPaginatedResult<T> {
items: T[];
paginationKind: "cursor";
nextCursor?: string;
}

export interface OffsetPaginatedResult<T> {
items: T[];
paginationKind: "offset";
}

export type NormalizedPaginatedResult<T> =
| CursorPaginatedResult<T>
  | OffsetPaginatedResult<T>;

export function normalizePaginated<T>(
input:
| { data: T[]; meta: { pagination: { kind: "cursor" | "offset" } } }
    | null
    | undefined,
): NormalizedPaginatedResult<T> {
if (!input) return { items: [], paginationKind: "offset" };

const kind = input.meta?.pagination?.kind ?? "offset";
return {
items: Array.isArray(input.data) ? input.data : [],
paginationKind: kind,
  };
}

export function normalizeSingle<T>(input: T | null | undefined): T | null {
return input ?? null;
}

export interface NormalizedBadge {
id: string;
name: string;
description?: string;
iconUrl?: string;
earnedAt?: string;
progress?: number;
[extra: string]: unknown; // Backend may add fields not yet modelled
}

export function normalizeBadgeArray(
input: unknown[] | null | undefined,
): NormalizedBadge[] {
if (!input || !Array.isArray(input)) return [];

return input.map((item): NormalizedBadge => {
if (typeof item !== "object" || item === null) {
return { id: String(item), name: String(item) };
    }
const record = item as Record<string, unknown>;
return {
id: typeof record.id === "string" ? record.id : "?",
name: typeof record.name === "string" ? record.name : "?",
description:
typeof record.description === "string" ? record.description : undefined,
iconUrl: typeof record.iconUrl === "string" ? record.iconUrl : undefined,
earnedAt:
typeof record.earnedAt === "string" ? record.earnedAt : undefined,
progress:
typeof record.progress === "number" ? record.progress : undefined,
...record, // spillover for fields not yet modelled
    };
  });
}
