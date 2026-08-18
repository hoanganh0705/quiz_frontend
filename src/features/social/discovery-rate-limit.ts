

export const SEARCH_RATE_LIMIT_HEADER =
"X-RateLimit-Reset-Search" as const;

export const SEARCH_RATE_LIMIT_HEADER_SECONDS =
"X-RateLimit-Reset-Search-Seconds" as const;

export interface DecodedSearchRateLimit {

readonly cooldownSeconds: number | null;
}

export function decodeSearchRateLimit(
headers: Record<string, string | string[] | undefined>,
): DecodedSearchRateLimit {

const toString = (
value: string | string[] | undefined,
  ): string | null => {
if (value === undefined || value === null) return null;
if (Array.isArray(value)) return value[0] ?? null;
return value;
  };

const parseNonNegativeInt = (s: string | null): number | null => {
if (s === null) return null;
const n = Number(s);
if (!Number.isFinite(n)) return null;
if (n < 0) return null;

const rounded = Math.round(n);
if (rounded > 3600) return 3600;
return rounded;
  };

const getHeader = (
h: Record<string, string | string[] | undefined>,
name: string,
  ): string | null => {
const lower = name.toLowerCase();
for (const [key, value] of Object.entries(h)) {
if (key.toLowerCase() === lower) {
return toString(value);
      }
    }
return null;
  };

const epochStr = getHeader(headers, SEARCH_RATE_LIMIT_HEADER);
if (epochStr !== null) {
const epochNum = Number(epochStr);
if (Number.isFinite(epochNum) && epochNum >= 0) {
const deltaMs = epochNum - Date.now();
if (deltaMs > 0) {
const seconds = Math.ceil(deltaMs / 1000);
return { cooldownSeconds: Math.min(seconds, 3600) };
      }
    }
  }

const secondsStr = getHeader(headers, SEARCH_RATE_LIMIT_HEADER_SECONDS);
if (secondsStr !== null) {
const seconds = parseNonNegativeInt(secondsStr);
if (seconds !== null && seconds > 0) {
return { cooldownSeconds: Math.min(seconds, 3600) };
    }
  }

return { cooldownSeconds: null };
}
