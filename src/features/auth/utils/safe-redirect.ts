

const MAX_PATH_LENGTH = 2048;

const LOGIN_PATH_PREFIXES: ReadonlyArray<string> = ["/login"];

export function isSafeRedirectTarget(target: unknown): target is string {

if (!target) return false;

if (typeof target !== "string") return false;

if (target.length === 0) return false;

if (target.length > MAX_PATH_LENGTH) return false;

if (target.startsWith("//")) return false;

if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return false;

if (/[\x00-\x1f\x7f]/.test(target)) return false;

if (LOGIN_PATH_PREFIXES.some((prefix) => target.startsWith(prefix))) {
return false;
  }

if (!target.startsWith("/")) return false;

return true;
}

export function safeRedirectTarget(raw: string | null | undefined): string {
if (isSafeRedirectTarget(raw)) {
return raw;
  }
return "/quizzes";
}
