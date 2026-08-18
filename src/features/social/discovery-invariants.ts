

export const DEBOUNCE_WINDOW_MS = 300 as const;

export const DEBOUNCE_WINDOW_MIN_MS = 150 as const;

export const DEBOUNCE_WINDOW_MAX_MS = 600 as const;

export const SEARCH_MIN_QUERY_LENGTH = 2 as const;

export const SEARCH_MAX_QUERY_LENGTH = 64 as const;

export const SEARCH_VIRTUALIZATION_THRESHOLD = 40 as const;

export const SUGGESTIONS_PAGE_SIZE = 10 as const;

export const SEARCH_PAGE_SIZE = 20 as const;

export const TRENDING_PAGE_SIZE = 25 as const;

export function clampDebounceWindow(inputMs: number): number {
if (!Number.isFinite(inputMs)) return DEBOUNCE_WINDOW_MS;
if (inputMs < DEBOUNCE_WINDOW_MIN_MS) return DEBOUNCE_WINDOW_MIN_MS;
if (inputMs > DEBOUNCE_WINDOW_MAX_MS) return DEBOUNCE_WINDOW_MAX_MS;
return inputMs;
}

export function isQueryLengthValid(query: string): boolean {
const trimmed = query.trim();
if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) return false;
if (trimmed.length > SEARCH_MAX_QUERY_LENGTH) return false;
return true;
}

export const DISCOVERY_INVARIANTS = Object.freeze({
debounceWindowMs: DEBOUNCE_WINDOW_MS,
debounceWindowMinMs: DEBOUNCE_WINDOW_MIN_MS,
debounceWindowMaxMs: DEBOUNCE_WINDOW_MAX_MS,
searchMinQueryLength: SEARCH_MIN_QUERY_LENGTH,
searchMaxQueryLength: SEARCH_MAX_QUERY_LENGTH,
virtualizationThreshold: SEARCH_VIRTUALIZATION_THRESHOLD,
suggestionsPageSize: SUGGESTIONS_PAGE_SIZE,
searchPageSize: SEARCH_PAGE_SIZE,
trendingPageSize: TRENDING_PAGE_SIZE,
});
