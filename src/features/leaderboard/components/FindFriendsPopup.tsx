"use client";

/**
 * `FindFriendsPopup` — live modal showing the viewer's friend
 * suggestions.
 *
 * Reads from `useSuggestions('me')` which calls the social suggestions endpoint.
 *
 * ## Auth gating
 *
 * The suggestions endpoint is auth-only. Anonymous viewers see a
 * "Sign in to see friend suggestions" message instead of an empty
 * list.
 *
 * ## Privacy
 *
 * `useSuggestions` returns a `visibility` discriminator:
 *   - `blocked_by_viewer` / `blocked_viewer` / `private` /
 *     `not_found` → render a privacy notice.
 *   - `visible` → render the list.
 *
 * The hook is the single source of truth for the privacy mapping
 * (the documented contract);
 * `resolveSuggestionsVisibility` is the canonical resolver.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, UserPlus, Users, X } from "lucide-react";
import Image from "next/image";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { useSuggestions } from "@/features/social/hooks/useSuggestions";
import type { SocialSuggestionItemDto } from "@/features/social/types";

interface FindFriendsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FindFriendsPopup({ isOpen, onClose }: FindFriendsPopupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuthState();

  // Radix Dialog mounts the children even when the dialog is closed
  // (visibility is driven by CSS, not unmount). To avoid firing the
  // suggestions endpoint in the background — and, more importantly,
  // to avoid hammering it during the brief Strict-Mode double-mount
  // window — only call `useSuggestions` while the popup is open.
  // The hook's cache key still survives re-opens, so a single
  // open-then-close cycle is enough to populate the list.
  const suggestionsTarget = isOpen && isAuthenticated ? "me" : null;
  const { items, isLoading, visibility, error, retry } =
    useSuggestions(suggestionsTarget);

  const filtered: readonly SocialSuggestionItemDto[] = searchQuery
    ? items.filter((s) =>
        s.user.userName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/80 text-foreground max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden p-6 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Find Friends
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Search and connect with friends to compare your quiz rankings and achievements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchQuery) {
                  e.preventDefault();
                  setSearchQuery("");
                }
              }}
              aria-label="Search suggestions"
              className="pl-10 pr-10 w-full bg-muted/50 border border-border/70 text-foreground placeholder:text-muted-foreground rounded-xl h-10 px-3.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Content */}
          {!isAuthenticated ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <Users
                className="w-12 h-12 mx-auto opacity-50"
                aria-hidden="true"
              />
              <p>Sign in to see friend suggestions</p>
            </div>
          ) : visibility !== "visible" ? (
            <PrivacyNotice visibility={visibility} onRetry={retry} />
          ) : isLoading && items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading suggestions…</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <p>Could not load suggestions.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void retry();
                }}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <Users
                className="w-12 h-12 mx-auto opacity-50"
                aria-hidden="true"
              />
              <p>
                {searchQuery
                  ? `No suggestions matching "${searchQuery}"`
                  : "No suggestions right now — check back later."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filtered.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.user.userId}
                  suggestion={suggestion}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground hover:bg-accent"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Privacy notice ─────────────────────────────────────────────────────

interface PrivacyNoticeProps {
  visibility: string;
  onRetry: () => Promise<void>;
}

function PrivacyNotice({ visibility, onRetry }: PrivacyNoticeProps) {
  let message: string;
  switch (visibility) {
    case "blocked_by_viewer":
      message = "You blocked some of these users — unblock to see them again.";
      break;
    case "blocked_viewer":
      message = "Some of these users blocked you.";
      break;
    case "private":
      message =
        "Your friend list is private. Update your privacy settings to see suggestions.";
      break;
    case "not_found":
      message = "No suggestions available.";
      break;
    default:
      message = "Suggestions are unavailable right now.";
  }
  return (
    <div className="text-center py-8 text-foreground-secondary space-y-2">
      <p>{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void onRetry();
        }}
      >
        Retry
      </Button>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

interface SuggestionRowProps {
  suggestion: SocialSuggestionItemDto;
}

function SuggestionRow({ suggestion }: SuggestionRowProps) {
  const avatarSrc = suggestion.user.avatarUrl ?? "/placeholder.svg";
  const displayName =
    suggestion.user.displayName ?? `@${suggestion.user.userName}`;
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 bg-muted/60 rounded-lg border border-border/60 hover:bg-accent transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden">
          <Image
            src={avatarSrc}
            alt={suggestion.user.userName}
            width={44}
            height={44}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            title={displayName}
            className="truncate text-sm font-semibold text-foreground"
          >
            {displayName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {suggestion.mutualFriendsCount > 0 ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {suggestion.mutualFriendsCount} mutual friend
                {suggestion.mutualFriendsCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <Badge variant="secondary" className="text-xs">
              {suggestion.reason}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-default hover:bg-default-hover text-default-foreground"
        type="button"
      >
        <UserPlus className="w-4 h-4 mr-1" aria-hidden="true" />
        Follow
      </Button>
    </div>
  );
}
