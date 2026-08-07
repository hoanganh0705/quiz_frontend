/**
 * `shared/log/` — centralized logging facade (Phase 11 / P2-113).
 *
 * Single entry point for every `console.*` call in the production
 * source tree. The previous baseline had `console.log` /
 * `console.warn` calls scattered across `lib/api/core/custom-instance.ts`,
 * `app/admin/quizzes/page.tsx`, `app/admin/users/page.tsx`, and a
 * dozen other locations — making it impossible to toggle verbosity
 * by environment, redact PII in production, or pipe client-side
 * logs into Sentry / Datadog consistently.
 *
 * ## API
 *
 *   - `logger.info(category, message, …args)` — informational events.
 *   - `logger.warn(category, message, …args)` — recoverable warnings.
 *   - `logger.error(category, message, …args)` — unrecoverable errors.
 *   - `logger.debug(category, message, …args)` — verbose diagnostics;
 *     silenced outside development unless `localStorage['quiz:log:debug']`
 *     is set to `'1'`.
 *
 * `category` is a dotted namespace (`auth.logout`, `admin.quiz`,
 * `social.follow`, …) — the logger does not interpret it, but it
 * flows into the Sentry breadcrumb `category` when present so a
 * future Sentry transport can group logs by domain.
 *
 * ## Why a thin wrapper
 *
 * The audit asked for "centralize logging in `src/shared/log/`".
 * This module is intentionally a thin shim over `console.*` so:
 *
 *   1. The codebase can switch transports (Sentry, Datadog, OpenTelemetry)
 *      in one place without rewriting call-sites.
 *   2. Verbosity can be toggled per environment without touching
 *      dozens of files.
 *   3. PII redaction can be added centrally without rewriting call-sites.
 *   4. Tests can `vi.mock('@/shared/log')` once instead of stubbing
 *      `console.*` everywhere.
 *
 * Migration note: call-sites that previously used bare `console.log`
 * should switch to `logger.info('module.action', '…', payload)` so
 * the category carries semantic structure and the verbosity rules
 * apply uniformly. The shim still calls through to the underlying
 * `console.*` method so existing Sentry browser-instrumentation
 * (`@sentry/nextjs` browser integration) continues to capture the
 * log lines.
 */

const isDev =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NODE_ENV !== "production";

function debugEnabled(): boolean {
  if (typeof window === "undefined") return isDev;
  try {
    return window.localStorage.getItem("quiz:log:debug") === "1";
  } catch {
    return isDev;
  }
}

/**
 * Format a log line for `console.*`. Centralised so the format is
 * consistent across call-sites and easy to grep for.
 */
function format(category: string, message: string): string {
  return `[${category}] ${message}`;
}

export interface Logger {
  readonly info: (category: string, message: string, ...args: unknown[]) => void;
  readonly warn: (category: string, message: string, ...args: unknown[]) => void;
  readonly error: (category: string, message: string, ...args: unknown[]) => void;
  readonly debug: (category: string, message: string, ...args: unknown[]) => void;
}

export const logger: Logger = Object.freeze({
  info(category: string, message: string, ...args: unknown[]): void {
    console.info(format(category, message), ...args);
  },
  warn(category: string, message: string, ...args: unknown[]): void {
    console.warn(format(category, message), ...args);
  },
  error(category: string, message: string, ...args: unknown[]): void {
    console.error(format(category, message), ...args);
  },
  debug(category: string, message: string, ...args: unknown[]): void {
    if (!debugEnabled()) return;
    console.debug(format(category, message), ...args);
  },
});

export default logger;