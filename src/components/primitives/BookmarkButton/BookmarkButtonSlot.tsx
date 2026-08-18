"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import {
  BookmarkButton,
  type BookmarkButtonVariant,
} from "@/components/primitives/BookmarkButton";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { useBookmarkCollections } from "@/features/bookmarks/hooks/use-bookmark-collections";
import { useDefaultCollectionId } from "@/features/bookmarks/hooks/use-default-collection-id";
import { useBookmarkQuiz } from "@/features/bookmarks/hooks/use-bookmark-quiz";
import { useUnbookmarkQuiz } from "@/features/bookmarks/hooks/use-unbookmark-quiz";
import { BookmarksSetupPrompt } from "@/features/bookmarks/components/BookmarksSetupPrompt";
import { getBookmarkMutationErrorState } from "@/features/bookmarks/utils";
import { useIsBookmarked } from "@/features/quizzes/hooks/useIsBookmarked";
import { cn } from "@/shared/utils/merge-class-names";

export type BookmarkButtonSlotVariant = "card" | "detail";

export interface BookmarkButtonSlotProps {
quizId: string;
variant?: BookmarkButtonSlotVariant;
className?: string;
}

export function BookmarkButtonSlot({
quizId,
variant = "card",
className,
}: BookmarkButtonSlotProps) {
const { isAuthenticated } = useAuthState();

const { isBookmarked, isLoading: membershipLoading } =
useIsBookmarked(quizId);

const {
isPending: isBookmarkedPending,
lastError: bookmarkError,
lastOutcome: bookmarkOutcome,
bookmark,
  } = useBookmarkQuiz(quizId);
const {
isPending: isUnbookmarkedPending,
lastError: unbookmarkError,
lastOutcome: unbookmarkOutcome,
unbookmark,
  } = useUnbookmarkQuiz(quizId);

const isPending = isBookmarkedPending || isUnbookmarkedPending;

const lastError = bookmarkError ?? unbookmarkError;

const handleToggle = useCallback(() => {
if (isBookmarked) {
void unbookmark();
    } else {
void bookmark();
    }
  }, [isBookmarked, bookmark, unbookmark]);

const lastOutcome = bookmarkOutcome ?? unbookmarkOutcome;
const isNoCollection =
(lastOutcome as { kind?: string } | null)?.kind === "no_collection";
const [setupOpen, setSetupOpen] = useState(false);

useEffect(() => {
setSetupOpen((current) => current || isNoCollection);
  }, [isNoCollection]);

const handleDismiss = useCallback(() => {
    setSetupOpen(false);
  }, []);

  const slotRef = useRef<HTMLDivElement | null>(null);
  // Mark the rendered trigger once on mount so BookmarksSetupPrompt can
  // return focus to it when the dialog closes (WCAG 2.4.3). The original
  // implementation re-ran this effect on every render, which is wasteful
  // and trips React Strict Mode warnings — the attribute only needs to
  // exist once, after the inner button has mounted.
  useEffect(() => {
    const el = slotRef.current?.querySelector<HTMLElement>(
      'button[data-testid^="bookmark-button"]',
    );
    if (el) {
      el.setAttribute("data-bookmark-trigger", "true");
    }
  }, []);

  const errorState = getBookmarkMutationErrorState(lastError, lastOutcome);

const buttonVariant: BookmarkButtonVariant =
variant === "detail" ? "iconWithLabel" : "icon";

const handleSlotClick = useCallback(
(event: MouseEvent<HTMLDivElement>) => {
if (variant !== "card") return;
const target = event.target as HTMLElement | null;
if (target && target.closest('[data-testid^="bookmark-button"]')) {
event.stopPropagation();
event.preventDefault();
      }
    },
[variant],
  );

const { isLoading: collectionsLoading } = useBookmarkCollections();
const {
defaultCollectionId: derivedDefaultCollectionId,
isLoading: defaultCollectionLoading,
  } = useDefaultCollectionId();
if (collectionsLoading && isAuthenticated) {
    return (
      <div
        ref={slotRef}
        className={cn("inline-flex", className)}
        data-testid="bookmark-button-slot"
        data-state="loading"
        data-variant={variant}
        data-default-collection-id={derivedDefaultCollectionId ?? ""}
        data-default-collection-loading={
          defaultCollectionLoading ? "true" : "false"
        }
        onClick={handleSlotClick}
      >
        <BookmarkButton
          isBookmarked={false}
          isLoading
          isAuthenticated={isAuthenticated}
          isPending={false}
          errorState={null}
          onToggle={() => {}}
          variant={buttonVariant}
        />
      </div>
    );
  }
  return (
    <div
      ref={slotRef}
      className={cn("inline-flex", className)}
      data-testid="bookmark-button-slot"
      data-state="resolved"
      data-variant={variant}
      data-authenticated={isAuthenticated ? "true" : "false"}
      data-bookmarked={isBookmarked ? "true" : "false"}
      data-default-collection-id={derivedDefaultCollectionId ?? ""}
      data-default-collection-loading={
        defaultCollectionLoading ? "true" : "false"
      }
      onClick={handleSlotClick}
    >
<BookmarkButton
isBookmarked={isBookmarked}
isLoading={membershipLoading}
isAuthenticated={isAuthenticated}
isPending={isPending}
errorState={errorState.kind === "ok" ? null : errorState}
onToggle={handleToggle}
variant={buttonVariant}
      />
<BookmarksSetupPrompt open={setupOpen} onDismiss={handleDismiss} />
</div>
  );
}
