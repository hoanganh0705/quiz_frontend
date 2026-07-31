/**
 * Test fixtures for deletion-event integration tests.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T27.
 *
 * ## Purpose
 *
 * Provides a synthesized `ACCOUNT_DELETED` event for tests that
 * simulate a sibling tab's deletion broadcast. The fixture is a
 * plain object — the production listener filters on `type` and
 * `tabId`, so a literal object with the documented shape is
 * sufficient.
 *
 * The receiver does NOT inspect the payload; the fixture exists
 * only to satisfy the `AuthEvent` discriminated-union narrowing.
 */

import type { AccountDeletedEvent } from "@/lib/api/core/broadcast-channel";

export const ACCOUNT_DELETED_EVENT: AccountDeletedEvent = {
  type: "ACCOUNT_DELETED",
  tabId: "tab-of-origin",
  timestamp: 1_700_000_000_000,
};
