"use client";

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

items: readonly SocialUserSummaryDto[];

threshold?: number;

row: (props: { user: SocialUserSummaryDto; index: number }) => ReactNode;
}

function calculateWindow(
scrollTop: number,
containerHeight: number,
itemCount: number,
batchSize: number,
): { start: number; end: number } {

const ROW_HEIGHT_APPROX = 60;
const rowsInView = Math.ceil(containerHeight / ROW_HEIGHT_APPROX) + 2 * batchSize;

const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_APPROX) - batchSize);
const visibleCount = Math.min(rowsInView, itemCount - start);
const end = Math.min(itemCount, start + visibleCount);

return { start, end };
}

export function UserSearchResultWindow({
items,
threshold = SEARCH_VIRTUALIZATION_THRESHOLD,
row,
}: UserSearchResultWindowProps): ReactElement {
const containerRef = useRef<HTMLDivElement>(null);
const [windowStart, setWindowStart] = useState(0);
const [windowEnd, setWindowEnd] = useState(WINDOW_RENDER_BATCH);
const [isVirtualized, setIsVirtualized] = useState(false);

const shouldVirtualize = items.length >= threshold;

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

useEffect(() => {
const container = containerRef.current;
if (!container || !shouldVirtualize) return;

container.addEventListener("scroll", handleScroll, { passive: true });
return () => {
container.removeEventListener("scroll", handleScroll);
    };
  }, [shouldVirtualize, handleScroll]);

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
