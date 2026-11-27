"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Check,
  Clock,
  Loader2,
  Search,
  Send,
  Sparkles,
  Swords,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { DEFAULT_TOAST_DURATION_MS, useToast } from "@/lib/forms/useToast";
import { getQueryClient } from "@/providers/QueryProvider";

import { listQuizzes } from "@/features/quizzes/services/quizzes.service";
import { CompareStatsPanel } from "@/features/social/components/CompareStatsPanel";
import {
  useCancelFriendRequest,
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
  useRespondFriendRequest,
  useSendFriendRequest,
} from "@/features/social/hooks";
import { useUserSearch } from "@/features/social/hooks/useUserSearch";
import { displayNameOf } from "@/features/social/utils/display-name";
import { useMyAnalytics } from "@/features/users/hooks/useMyAnalytics";
import { useUser } from "@/features/users/store/user-store";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import type {
  SocialFriendRequestDto,
  SocialUserSummaryDto,
} from "@/features/social/types";
import type { SearchableUserDto } from "@/lib/api/generated/schemas/searchableUserDto";

function coerceAvatarSrc(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

type QuizInviteOption = { id: string; title: string };

function useQuizInviteOptions(): QuizInviteOption[] {
  const { data } = useQuery(
    {
      queryKey: ["friends", "quiz-invite-options"] as const,
      queryFn: async () => {
        const result = await listQuizzes({ limit: 12 });
        const items =
          (
            result as {
              data?: Array<{
                quizId: string;
                title: string;
                isHidden?: boolean;
              }>;
            }
          ).data ?? [];
        return items
          .filter((item) => item.isHidden !== true)
          .slice(0, 12)
          .map((item) => ({ id: item.quizId, title: item.title }));
      },
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
    getQueryClient(),
  );
  return data ?? [];
}

export function FriendsHubPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [compareFriendId, setCompareFriendId] = useState<string>("");
  const [inviteSelections, setInviteSelections] = useState<
    Record<string, string>
  >({});

  const user = useUser();
  const quizOptions = useQuizInviteOptions();
  const viewerUserId = user?.userId ?? null;

  const friendsHook = useFriends(viewerUserId);
  const incomingHook = useIncomingRequests();
  const outgoingHook = useOutgoingRequests();
  const searchHook = useUserSearch(searchQuery);

  const { analytics: myAnalytics } = useMyAnalytics();

  const friends = friendsHook.users;
  const incomingRequests = incomingHook.requests;
  const outgoingRequests = outgoingHook.requests;

  const outgoingAddresseeIds = useMemo(
    () => new Set(outgoingRequests.map((r) => r.addresseeId).filter(Boolean)),
    [outgoingRequests],
  );

  const friendUserIds = useMemo(
    () => new Set(friends.map((f) => f.userId).filter(Boolean)),
    [friends],
  );

  const compareFriend = useMemo(
    () => friends.find((f) => f.userId === compareFriendId) ?? null,
    [friends, compareFriendId],
  );

  const handleSelectQuiz = useCallback((friendId: string, quizId: string) => {
    setInviteSelections((prev) => ({
      ...prev,
      [friendId]: quizId,
    }));
  }, []);

  const handleFocusSearch = useCallback(() => {
    document.getElementById("friends-search-input")?.focus();
  }, []);

  return (
    <main className={`${PAGE_CONTAINER_CLASS} space-y-8`}>
      {/* Header with Title and Social Status Counter Chips */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 shadow-xs">
            <Users className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Friends &amp; Social
            </h1>
            <p className="text-sm text-muted-foreground">
              Connect with friends, challenge them to quizzes, and track your head-to-head stats.
            </p>
          </div>
        </div>

        {/* Live Social Stat Pills & Discovery Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/social">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Feed
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/social/suggestions">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Suggestions
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/social/blocked">
              <Ban className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Blocked
            </Link>
          </Button>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium backdrop-blur-xs transition-colors hover:border-brand/30">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-muted-foreground">Friends:</span>
            <span className="font-mono font-bold tabular-nums text-foreground">{friends.length}</span>
          </div>

          {incomingRequests.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 backdrop-blur-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span>Pending Requests:</span>
              <span className="font-mono font-bold tabular-nums">{incomingRequests.length}</span>
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xs transition-colors hover:border-border">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Sent:</span>
              <span className="font-mono font-bold tabular-nums text-foreground">{outgoingRequests.length}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main 12-Column Responsive Layout: 8-Column Main Content + 4-Column Companion Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area: Friends List & Discovery */}
        <div className="lg:col-span-8 space-y-8">
          {/* Card 1: Friends List & Quiz Invites (Primary Surface) */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold tracking-tight">Friends List & Quiz Invites</h2>
                  <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand font-mono tabular-nums">
                    {friends.length}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <FriendsListPanel
                isLoading={friendsHook.isLoading}
                error={friendsHook.error}
                retry={friendsHook.retry}
                friends={friends}
                inviteSelections={inviteSelections}
                onSelectQuiz={handleSelectQuiz}
                quizOptions={quizOptions}
                onFindFriendsClick={handleFocusSearch}
              />
            </CardContent>
          </Card>

          {/* Card 2: Find Friends (Discovery Surface) */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold tracking-tight">Find Friends</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <Input
                  id="friends-search-input"
                  className="pl-10 pr-9 transition-colors focus-visible:border-brand/40"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by username or display name..."
                  aria-label="Search users to add as friends"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                    aria-label="Clear search query"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : searchHook.isLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                ) : null}
              </div>

              <SearchResultsPanel
                isLoading={searchHook.isLoading}
                isStale={searchHook.isStale}
                error={searchHook.error}
                isRateLimited={searchHook.isRateLimited}
                remainingSeconds={searchHook.remainingSeconds}
                queryLength={searchQuery.trim().length}
                items={searchHook.items}
                outgoingAddresseeIds={outgoingAddresseeIds}
                friendUserIds={friendUserIds}
              />
            </CardContent>
          </Card>
        </div>

        {/* Companion Sidebar: Friend Requests & Compare Stats */}
        <div className="lg:col-span-4 space-y-8">
          {/* Card 3: Friend Requests (Action & Status Queue) */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold tracking-tight">Friend Requests</h2>
                  {incomingRequests.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                      {incomingRequests.length} new
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <RequestsPanel
                title="Incoming Requests"
                emptyLabel="No incoming requests."
                isLoading={incomingHook.isLoading}
                error={incomingHook.error}
                retry={incomingHook.retry}
                requests={incomingRequests}
                kind="incoming"
              />

              <div className="border-t border-border/40 pt-4">
                <RequestsPanel
                  title="Sent Requests"
                  emptyLabel="No sent requests."
                  isLoading={outgoingHook.isLoading}
                  error={outgoingHook.error}
                  retry={outgoingHook.retry}
                  requests={outgoingRequests}
                  kind="outgoing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Compare Stats (Head-to-Head Analytics) */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-brand" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold tracking-tight">Compare Stats</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add a friend to start comparing head-to-head stats.
                </p>
              ) : (
                <Select
                  value={compareFriendId}
                  onValueChange={setCompareFriendId}
                >
                  <SelectTrigger
                    className="w-full transition-colors focus-visible:border-brand/40"
                    aria-label="Select a friend to compare stats"
                  >
                    <SelectValue placeholder="Choose friend to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.map((friend) => (
                      <SelectItem key={friend.userId} value={friend.userId}>
                        {displayNameOf(friend)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {compareFriend ? (
                <CompareStatsPanel
                  friend={compareFriend}
                  myAnalytics={myAnalytics}
                  myAnalyticsLoading={!myAnalytics}
                  viewerLabel={user?.displayName ?? user?.username ?? "You"}
                />
              ) : friends.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select a friend above to see your side-by-side performance.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

interface SearchResultsPanelProps {
  isLoading: boolean;
  isStale: boolean;
  error: { code?: string; message?: string } | null;
  isRateLimited: boolean;
  remainingSeconds: number;
  queryLength: number;
  items: ReadonlyArray<SearchableUserDto>;
  outgoingAddresseeIds: ReadonlySet<string>;
  friendUserIds: ReadonlySet<string>;
}

const SearchResultsPanel = memo(function SearchResultsPanel({
  isLoading,
  isStale,
  error,
  isRateLimited,
  remainingSeconds,
  queryLength,
  items,
  outgoingAddresseeIds,
  friendUserIds,
}: SearchResultsPanelProps) {
  if (queryLength === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Start typing a username or display name to search for players.
      </p>
    );
  }

  if (queryLength < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Type at least 2 characters to search for players.
      </p>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
        <span>Searching players…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground" role="alert">
        Search failed. Try again in a moment.
      </p>
    );
  }

  if (isRateLimited) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Rate limited — try again in {remainingSeconds}s.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No matching players found.
      </p>
    );
  }

  return (
    <ul className="space-y-3" aria-busy={isStale}>
      {items.map((user) => (
        <SearchResultRow
          key={user.userId}
          user={user}
          isOutgoingPending={outgoingAddresseeIds.has(user.userId)}
          isFriendUser={friendUserIds.has(user.userId)}
        />
      ))}
    </ul>
  );
});

const SearchResultRow = memo(function SearchResultRow({
  user,
  isOutgoingPending,
  isFriendUser,
}: {
  user: SearchableUserDto;
  isOutgoingPending: boolean;
  isFriendUser: boolean;
}) {
  const [isLocallySent, setIsLocallySent] = useState(false);
  const mut = useSendFriendRequest(user.userId);
  const name = displayNameOf(user);

  useEffect(() => {
    if (isOutgoingPending) {
      setIsLocallySent(false);
    }
  }, [isOutgoingPending]);

  const isFriend = user.isFriend || isFriendUser;
  const hasPending =
    user.hasPendingRequest ||
    isOutgoingPending ||
    isLocallySent ||
    mut.isPending;
  const canSend = !isFriend && !hasPending && !user.isBlocked;

  const statusLabel = isFriend
    ? "Friends"
    : mut.isPending
      ? "Sending…"
      : hasPending
        ? "Pending"
        : user.isBlocked
          ? "Blocked"
          : "Add Friend";

  const handleSend = useCallback(() => {
    setIsLocallySent(true);
    mut.send();
  }, [mut]);

  return (
    <li className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3.5 backdrop-blur-xs transition-colors hover:border-brand/30">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 ring-1 ring-border/50">
          <AvatarImage src={coerceAvatarSrc(user.avatarUrl)} alt={name} />
          <AvatarFallback className="bg-brand/10 text-brand font-semibold text-xs">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">
            @{user.username}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={canSend ? "default" : "outline"}
        onClick={handleSend}
        disabled={!canSend || mut.isPending}
        aria-label={
          isFriend
            ? `Already friends with ${name}`
            : hasPending
              ? `Request already pending for ${name}`
              : user.isBlocked
                ? `${name} is blocked`
                : `Send friend request to ${name}`
        }
      >
        {mut.isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
            Sending…
          </>
        ) : (
          statusLabel
        )}
      </Button>
    </li>
  );
});

interface RequestsPanelProps {
  title: string;
  emptyLabel: string;
  isLoading: boolean;
  error: { code?: string; message?: string } | null;
  retry: () => Promise<void> | void;
  requests: ReadonlyArray<SocialFriendRequestDto>;
  kind: "incoming" | "outgoing";
}

const RequestsPanel = memo(function RequestsPanel({
  title,
  emptyLabel,
  isLoading,
  error,
  retry,
  requests,
  kind,
}: RequestsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {requests.length > 0 && (
          <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
            {requests.length}
          </span>
        )}
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-hidden="true" />
          <span>Loading requests…</span>
        </div>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" role="alert">
            Failed to load {title.toLowerCase()}.
          </p>
          <Button size="sm" variant="outline" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {requests.map((req) => (
            <RequestRow key={req.id} request={req} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  );
});

const RequestRow = memo(function RequestRow({
  request,
  kind,
}: {
  request: SocialFriendRequestDto;
  kind: "incoming" | "outgoing";
}) {
  const subject =
    kind === "outgoing"
      ? request.addressee &&
        (request.addressee.userName || request.addressee.displayName)
        ? request.addressee
        : {
            id: request.addresseeId,
            userId: request.addresseeId,
            userName: request.addresseeId.slice(0, 8),
            displayName: "Pending player",
            avatarUrl: null,
            isPrivate: false,
            createdAt: request.createdAt,
          }
      : request.requester;
  const name = displayNameOf(subject);
  return (
    <li className="rounded-xl border border-border bg-card/60 p-3 space-y-2.5 backdrop-blur-xs transition-colors hover:border-brand/20">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="w-8 h-8 ring-1 ring-border/50">
          <AvatarImage
            src={subject.avatarUrl ?? undefined}
            alt={name}
          />
          <AvatarFallback className="bg-brand/10 text-brand font-semibold text-xs">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">
            @{subject.userName}
          </p>
        </div>
      </div>
      {kind === "incoming" ? (
        <IncomingRequestActions request={request} name={name} />
      ) : (
        <OutgoingRequestActions request={request} name={name} />
      )}
    </li>
  );
});

function IncomingRequestActions({
  request,
  name,
}: {
  request: SocialFriendRequestDto;
  name: string;
}) {
  const { push } = useToast();
  const mut = useRespondFriendRequest(request.requesterId, {
    assumeCanRespond: true,
  });

  const handleAccept = useCallback(async () => {
    const ok = await mut.respond({ friendshipId: request.id, action: "accept" });
    if (ok) {
      push({
        title: "Friend request accepted",
        body: `You are now friends with ${name}.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    } else {
      push({
        title: "Unable to accept request",
        body: "Please try again in a moment.",
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    }
  }, [mut, request.id, name, push]);

  const handleDecline = useCallback(async () => {
    const ok = await mut.respond({ friendshipId: request.id, action: "decline" });
    if (ok) {
      push({
        title: "Request declined",
        body: `Friend request from ${name} has been declined.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    } else {
      push({
        title: "Unable to decline request",
        body: "Please try again in a moment.",
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    }
  }, [mut, request.id, name, push]);

  return (
    <div
      className="flex gap-2"
      role="group"
      aria-label={`Respond to request from ${name}`}
    >
      <Button
        size="sm"
        className="flex-1"
        onClick={() => void handleAccept()}
        disabled={mut.isPending}
        aria-label={`Accept friend request from ${name}`}
      >
        {mut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <>
            <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" aria-hidden="true" />
            Accept
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={() => void handleDecline()}
        disabled={mut.isPending}
        aria-label={`Decline friend request from ${name}`}
      >
        <X className="h-3.5 w-3.5 mr-1 text-muted-foreground" aria-hidden="true" />
        Decline
      </Button>
    </div>
  );
}

function OutgoingRequestActions({
  request,
  name,
}: {
  request: SocialFriendRequestDto;
  name: string;
}) {
  const { push } = useToast();
  const mut = useCancelFriendRequest(request.addresseeId, {
    assumeCanCancel: true,
  });

  const handleCancel = useCallback(async () => {
    const ok = await mut.cancel(request.id);
    if (ok) {
      push({
        title: "Request cancelled",
        body: `Friend request to ${name} has been cancelled.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    } else {
      push({
        title: "Unable to cancel request",
        body: "Please try again in a moment.",
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    }
  }, [mut, request.id, name, push]);

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={() => void handleCancel()}
      disabled={mut.isPending || mut.alreadyCancelled}
      aria-label={`Cancel friend request to ${name}`}
    >
      {mut.isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
          Cancelling…
        </>
      ) : mut.alreadyCancelled ? (
        "Already cancelled"
      ) : (
        "Cancel Request"
      )}
    </Button>
  );
}

interface FriendsListPanelProps {
  isLoading: boolean;
  error: { code?: string; message?: string } | null;
  retry: () => Promise<void> | void;
  friends: ReadonlyArray<SocialUserSummaryDto>;
  inviteSelections: Record<string, string>;
  onSelectQuiz: (friendId: string, quizId: string) => void;
  quizOptions: ReadonlyArray<{ id: string; title: string }>;
  onFindFriendsClick?: () => void;
}

const FriendsListPanel = memo(function FriendsListPanel({
  isLoading,
  error,
  retry,
  friends,
  inviteSelections,
  onSelectQuiz,
  quizOptions,
  onFindFriendsClick,
}: FriendsListPanelProps) {
  if (isLoading && friends.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
        <span>Loading friends…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground" role="alert">
          Failed to load friends.
        </p>
        <Button size="sm" variant="outline" onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  }
  if (friends.length === 0) {
    return <EmptyFriendsState onFindFriendsClick={onFindFriendsClick} />;
  }
  return (
    <ul className="space-y-3">
      {friends.map((friend) => (
        <FriendRow
          key={friend.userId}
          friend={friend}
          selection={inviteSelections[friend.userId] ?? ""}
          onSelectQuiz={(quizId) => onSelectQuiz(friend.userId, quizId)}
          quizOptions={quizOptions}
        />
      ))}
    </ul>
  );
});

const FriendRow = memo(function FriendRow({
  friend,
  selection,
  onSelectQuiz,
  quizOptions,
}: {
  friend: SocialUserSummaryDto;
  selection: string;
  onSelectQuiz: (quizId: string) => void;
  quizOptions: ReadonlyArray<{ id: string; title: string }>;
}) {
  const name = displayNameOf(friend);
  const { push } = useToast();
  const [inviteSent, setInviteSent] = useState(false);

  const handleSendInvite = useCallback(() => {
    if (!selection) return;
    setInviteSent(true);
    push({
      title: "Invite sent!",
      body: `Quiz invite sent to ${name}.`,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
    setTimeout(() => setInviteSent(false), 3000);
  }, [selection, name, push]);

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-xs transition-colors hover:border-brand/30">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 ring-1 ring-border/50">
          <AvatarImage src={friend.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="bg-brand/10 text-brand font-semibold text-xs">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate font-mono">
            @{friend.userName}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
        <Select value={selection} onValueChange={onSelectQuiz}>
          <SelectTrigger
            className="w-full sm:w-60 transition-colors focus-visible:border-brand/40"
            aria-label={`Choose quiz to invite ${name}`}
          >
            <SelectValue placeholder="Choose quiz to invite" />
          </SelectTrigger>
          <SelectContent>
            {quizOptions.map((quiz) => (
              <SelectItem key={quiz.id} value={quiz.id}>
                {quiz.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={inviteSent ? "outline" : "default"}
          className={inviteSent ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium" : ""}
          onClick={handleSendInvite}
          disabled={!selection || inviteSent}
          aria-label={`Send quiz invite to ${name}`}
        >
          {inviteSent ? (
            <>
              <Check className="h-4 w-4 mr-1 text-emerald-500" aria-hidden="true" />
              Sent!
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Send Invite
            </>
          )}
        </Button>
      </div>
    </li>
  );
});

function EmptyFriendsState({ onFindFriendsClick }: { onFindFriendsClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Users className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-sm">No friends added yet</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Connect with other players below to send quiz challenges and compare your knowledge.
        </p>
      </div>
      {onFindFriendsClick && (
        <Button size="sm" variant="outline" onClick={onFindFriendsClick}>
          Find Players
        </Button>
      )}
    </div>
  );
}
