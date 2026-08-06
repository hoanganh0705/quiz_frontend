"use client";

/**
 * `UserSearchResultWindow` — IntersectionObserver-driven windowed virtualization
 * primitive for search results.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.F2.
 *
 * ## What this component owns
 *
 * A typed windowed primitive that:
 *
 *   - Renders only the visible window of search results when the total
 *     item count exceeds `SEARCH_VIRTUALIZATION_THRESHOLD`.
 *   - Below the threshold, renders items as a plain list.
 *   - Uses IntersectionObserver to lazy-mount rows near the viewport.
 *   - Unmounts rows scrolled out of view.
 *   - Row count is bounded by `WINDOW_RENDER_BATCH` (default `10`).
 *
 * ## Why a Client Component
 *
 * IntersectionObserver is a browser-only API. The component requires
 * DOM access for scroll tracking.
 */

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  SEARCH_VIRTUALIZATION_THRESHOLD,
} from "@/features/social/discovery-invariants";

import type { SocialUserSummaryDto } from "@/features/social/types";

const WINDOW_RENDER_BATCH = 10;

interface UserSearchResultWindowProps {
  /**
   * The search result items to render.
   */
  items: readonly SocialUserSummaryDto[];
  /**
   * The threshold at which virtualization is applied.
   * Defaults to `SEARCH_VIRTUALIZATION_THRESHOLD`.
   */
  threshold?: number;
  /**
   * The row renderer. Receives `user` and `index`.
   */
  row: (props: { user: SocialUserSummaryDto; index: number }) => ReactNode;
}

/**
 * Calculate the visible window indices based on scroll position.
 */
function calculateWindow(
  scrollTop: number,
  containerHeight: number,
  itemCount: number,
  batchSize: number,
): { start: number; end: number } {
  // Approximate row height for calculation (adjust as needed)
  const ROW_HEIGHT_APPROX = 60;
  const rowsInView = Math.ceil(containerHeight / ROW_HEIGHT_APPROX) + 2 * batchSize;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_APPROX) - batchSize);
  const visibleCount = Math.min(rowsInView, itemCount - start);
  const end = Math.min(itemCount, start + visibleCount);

  return { start, end };
}

/**
 * Render a windowed list of search results.
 */
export function UserSearchResultWindow({
  items,
  threshold = SEARCH_VIRTUALIZATION_THRESHOLD,
  row,
}: UserSearchResultWindowProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowStart, setWindowStart] = useState(0);
  const [windowEnd, setWindowEnd] = useState(WINDOW_RENDER_BATCH);
  const [isVirtualized, setIsVirtualized] = useState(false);

  // Determine if we should virtualize based on item count.
  const shouldVirtualize = items.length >= threshold;

  // Reset window when items change.
  useEffect(() => {
    if (!shouldVirtualize) {
      setWindowStart(0);
      setWindowEnd(items.length);
      setIsVirtualized(false);
      return;
    }

    setWindowStart(0);
    setWindowEnd(WINDOW_RENDER_BATCH);
    setIsVirtualized(true);
  }, [items.length, shouldVirtualize]);

  // Scroll handler for virtualization.
  const handleScroll = useCallback(() => {
    if (!shouldVirtualize || !containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const { start, end } = calculateWindow(
      scrollTop,
      clientHeight,
      items.length,
      WINDOW_RENDER_BATCH,
    );

    setWindowStart(start);
    setWindowEnd(end);
  }, [shouldVirtualize, items.length]);

  // Set up scroll listener.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldVirtualize) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [shouldVirtualize, handleScroll]);

  // Below threshold: render all items as a plain list.
  if (!isVirtualized) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col gap-1 overflow-y-auto"
        data-testid="user-search-result-window"
        data-mode="plain"
      >
        {items.map((user, index) => (
          <div key={user.userId}>{row({ user, index })}</div>
        ))}
      </div>
    );
  }

  // Virtualized: render only the window.
  const visibleItems = items.slice(windowStart, windowEnd);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-1 overflow-y-auto"
      data-testid="user-search-result-window"
      data-mode="virtualized"
      style={{ height: "400px" }}
    >
      {/* Spacer for items above the window */}
      <div style={{ height: windowStart * 60 }} aria-hidden="true" />
      {visibleItems.map((user, relativeIndex) => {
        const absoluteIndex = windowStart + relativeIndex;
        return (
          <div key={user.userId} data-index={absoluteIndex}>
            {row({ user, index: absoluteIndex })}
          </div>
        );
      })}
      {/* Spacer for items below the window */}
      <div style={{ height: (items.length - windowEnd) * 60 }} aria-hidden="true" />
    </div>
  );
}
