/**
 * `FeedGlobalNotice` — "Global feed — personalization coming soon"
 * labelling component.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.F5.
 *
 * ## What this component owns
 *
 * The labelling component that renders the documented "Global —
 * personalization coming soon" notice. The component:
 *
 *   - Renders a small banner above the feed with the text
 *     "Global feed — personalization coming soon".
 *   - Is always visible (not gated by the `social_feed_live`
 *     feature-flag value — the notice is the single source of
 *     truth that the feed is global, not personalised).
 *   - Uses a calm visual style (no aggressive warning icon).
 *   - Sets `role="status"` and `aria-label`.
 *   - Is server-renderable.
 *
 * ## Why always visible
 *
 * The notice is the canonical surface for the "this is a global
 * feed, not a personalised feed" labelling. The Story 6.9
 * acceptance criteria require the notice to be visible whenever
 * the feed surface is rendered; gating it on the flag would
 * create a race condition where the flag is `live` but the notice
 * is missing.
 *
 * ## Why a calm visual style
 *
 * The notice is informational, not a warning. The text is set with
 * a muted colour and no alert icon to keep the visual hierarchy
 * below the feed items themselves.
 *
 * ## SSR-safety
 *
 * The component renders identical markup on the server and the
 * client. No hooks are called.
 */

import { type ReactElement } from "react";

const NOTICE_COPY = {
  text: "Global feed — personalization coming soon",
  ariaLabel: "Global feed notice",
} as const;

/**
 * Labelling component that renders the "Global — personalization
 * coming soon" notice. Always visible.
 */
export function FeedGlobalNotice(): ReactElement {
  return (
    <div
      role="status"
      aria-label={NOTICE_COPY.ariaLabel}
      data-testid="feed-global-notice"
      className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b border-border"
    >
      <span>{NOTICE_COPY.text}</span>
    </div>
  );
}