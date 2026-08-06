"use client";

/**
 * `SocialListRow` — Single row component for the four list pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.C1.
 *
 * ## What this component owns
 *
 * The single-row visual vocabulary every list page inherits. The
 * component:
 *
 *   - Renders a `SocialUserSummaryDto` (followers / following /
 *     friends) or a `SocialBlockedUserDto` (blocked list) as a
 *     Next.js `Link` to `/users/:userId`.
 *   - **Never** serialises `followId` / `friendshipId` / `blockId`
 *     into the navigation URL, the analytics payload, or any DOM
 *     attribute.
 *   - On tap, fires an analytics event with `userId` only (via
 *     `trackSocialListRowTapped`).
 *   - Supports a `variant: 'blocked'` mode that suppresses any
 *     row action CTA — block / unblock controls live on the list
 *     page, not on the row.
 *
 * ## Why this exists
 *
 * Story 6.2's cross-batch invariant is "Internal ids (followId /
 * friendshipId / blockId) must not appear in URLs, localStorage,
 * or analytics payloads". Centralising the row component here means
 * there is exactly one place that emits the navigation href and the
 * analytics payload, so the lint invariant script only needs to
 * assert one pattern.
 *
 * ## Why a Client Component
 *
 * The analytics wrapper requires the client-side analytics context.
 * Server rendering would lose the click → analytics emission. The
 * rendered `<Link>` markup is identical on server and client; only
 * the click handler is client-only.
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  SocialBlockedUserDto,
  SocialUserSummaryDto,
} from "../types";

import { trackSocialListRowTapped } from "../utils/social-list-analytics";

// ─── Public types ─────────────────────────────────────────────────────────

export type SocialListRowVariant = "summary" | "blocked";

export interface SocialListRowProps {
  /**
   * The user this row represents.
   *
   * For `variant: 'summary'` this is a `SocialUserSummaryDto`
   * (followers / following / friends).
   *
   * For `variant: 'blocked'` this is a `SocialBlockedUserDto` whose
   * nested `user` field carries the `SocialUserSummaryDto` payload.
   */
  user: SocialUserSummaryDto | SocialBlockedUserDto;
  /** Whether this row is rendered in a normal list or a block list. */
  variant: SocialListRowVariant;
  /**
   * Optional analytics callback fired alongside the default
   * `trackSocialListRowTapped` emission. Useful for tests that
   * want to assert navigation side-effects without spying on the
   * analytics module.
   */
  onNavigate?: (userId: string) => void;
  /** Optional CSS class override. */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Unwrap the summary DTO regardless of which shape the caller passes.
 * `SocialBlockedUserDto` carries its summary under `.user`; a plain
 * `SocialUserSummaryDto` is its own summary.
 */
function toSummaryDto(
  user: SocialUserSummaryDto | SocialBlockedUserDto,
): SocialUserSummaryDto {
  if ("user" in user && user.user !== undefined) {
    return user.user;
  }
  return user as SocialUserSummaryDto;
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Render a single list row.
 *
 * The link target is always `/users/:userId`; no internal id is
 * appended as a query string or path segment.
 */
export function SocialListRow(props: SocialListRowProps): ReactElement {
  const { user, variant, onNavigate, className } = props;
  const summary = toSummaryDto(user);

  const href = `/users/${encodeURIComponent(summary.userId)}`;

  const handleClick = (): void => {
    trackSocialListRowTapped({
      userId: summary.userId,
      variant,
    });
    onNavigate?.(summary.userId);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      data-testid={`social-list-row-${variant}`}
      data-user-id={summary.userId}
      aria-label={`View profile for ${summary.userName}`}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Avatar>
        {summary.avatarUrl !== null && (
          <AvatarImage src={summary.avatarUrl} alt={`${summary.userName}'s avatar`} />
        )}
        <AvatarFallback>{summary.userName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex flex-col">
        <span className="font-medium leading-none">{summary.userName}</span>
        {summary.displayName !== null && (
          <span className="text-sm text-muted-foreground">
            {summary.displayName}
          </span>
        )}
      </span>
    </Link>
  );
}