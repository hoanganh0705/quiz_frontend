"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useUser } from "@/features/users/store/user-store";
import useSWR from "swr";
import { listQuizzes } from "@/features/quizzes/services/quizzes.service";
import { useMyAnalytics } from "@/features/users/hooks/useMyAnalytics";

import {
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
  useSendFriendRequest,
  useRespondFriendRequest,
  useCancelFriendRequest,
} from "@/features/social/hooks";
import { useUserSearch } from "@/features/social/hooks/useUserSearch";

import type {
  SocialFriendRequestDto,
  SocialUserSummaryDto,
} from "@/features/social/types";
import type { SearchableUserDto } from "@/lib/api/generated/schemas/searchableUserDto";

import { displayNameOf } from "@/features/social/utils/display-name";
import { useToast, DEFAULT_TOAST_DURATION_MS } from "@/lib/forms/useToast";
import { CompareStatsPanel } from "./_components/CompareStatsPanel";

function coerceAvatarSrc(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

type QuizInviteOption = { id: string; title: string };

function useQuizInviteOptions(): QuizInviteOption[] {
  const { data } = useSWR(
    ["friends", "quiz-invite-options"] as const,
    async () => {
      const result = await listQuizzes({ limit: 12 });
      const items =
        (
          result as {
            data?: Array<{ quizId: string; title: string; isHidden?: boolean }>;
          }
        ).data ?? [];
      return items
        .filter((item) => item.isHidden !== true)
        .slice(0, 12)
        .map((item) => ({ id: item.quizId, title: item.title }));
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );
  return data ?? [];
}

export default function FriendsPage() {
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

  const compareFriend = useMemo(
    () => friends.find((f) => f.userId === compareFriendId) ?? null,
    [friends, compareFriendId],
  );

  const handleSelectQuiz = useCallback(
    (friendId: string, quizId: string) => {
      setInviteSelections((prev) => ({
        ...prev,
        [friendId]: quizId,
      }));
    },
    [],
  );

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12 text-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Friends & Social</h1>
        <p className="text-foreground-secondary mt-2">
          Find friends, manage requests, invite friends to quizzes, and compare
          your stats.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1 p-5">
          <CardHeader>
            <CardTitle>Find Friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by username"
              aria-label="Search users to add as friends"
            />

            <SearchResultsPanel
              isLoading={searchHook.isLoading}
              isStale={searchHook.isStale}
              error={searchHook.error}
              isRateLimited={searchHook.isRateLimited}
              remainingSeconds={searchHook.remainingSeconds}
              hasQuery={searchQuery.trim().length > 0}
              items={searchHook.items}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 p-5">
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <RequestsPanel
              title="Incoming"
              emptyLabel="No incoming requests."
              isLoading={incomingHook.isLoading}
              error={incomingHook.error}
              retry={incomingHook.retry}
              requests={incomingRequests}
              kind="incoming"
            />

            <RequestsPanel
              title="Sent"
              emptyLabel="No sent requests."
              isLoading={outgoingHook.isLoading}
              error={outgoingHook.error}
              retry={outgoingHook.retry}
              requests={outgoingRequests}
              kind="outgoing"
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 p-5">
          <CardHeader>
            <CardTitle>Friends List & Quiz Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FriendsListPanel
              isLoading={friendsHook.isLoading}
              error={friendsHook.error}
              retry={friendsHook.retry}
              friends={friends}
              inviteSelections={inviteSelections}
              onSelectQuiz={handleSelectQuiz}
              quizOptions={quizOptions}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-1 p-5">
          <CardHeader>
            <CardTitle>Compare Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {friends.length === 0 ? (
              <p className="text-sm text-foreground-secondary">
                Add a friend to start comparing stats.
              </p>
            ) : (
              <Select
                value={compareFriendId}
                onValueChange={setCompareFriendId}
              >
                <SelectTrigger className="w-full" aria-label="Select a friend to compare stats">
                  <SelectValue placeholder="Select a friend" />
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
              <p className="text-sm text-foreground-secondary">
                Select a friend to compare your stats.
              </p>
            ) : null}
          </CardContent>
        </Card>
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
  hasQuery: boolean;
  items: ReadonlyArray<SearchableUserDto>;
}

const SearchResultsPanel = memo(function SearchResultsPanel({
  isLoading,
  isStale,
  error,
  isRateLimited,
  remainingSeconds,
  hasQuery,
  items,
}: SearchResultsPanelProps) {
  if (!hasQuery) {
    return (
      <p className="text-sm text-foreground-secondary">
        Start typing to search for people on the platform.
      </p>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary" role="status">
        Searching…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-foreground-secondary" role="alert">
        Search failed. Try again in a moment.
      </p>
    );
  }

  if (isRateLimited) {
    return (
      <p className="text-sm text-foreground-secondary" role="status">
        Rate limited — try again in {remainingSeconds}s.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary" role="status">
        No matching users.
      </p>
    );
  }

  return (
    <ul className="space-y-3" aria-busy={isStale}>
      {items.map((user) => (
        <SearchResultRow key={user.userId} user={user} />
      ))}
    </ul>
  );
});

const SearchResultRow = memo(function SearchResultRow({
  user,
}: {
  user: SearchableUserDto;
}) {
  const mut = useSendFriendRequest(user.userId);
  const name = displayNameOf(user);
  const canSend = !user.isFriend && !user.hasPendingRequest && !user.isBlocked;
  const statusLabel = user.isFriend
    ? "Friends"
    : user.hasPendingRequest
      ? "Pending"
      : user.isBlocked
        ? "Blocked"
        : "Add";

  return (
    <li className="flex items-center justify-between border border-border rounded-md p-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-9 h-9">
          <AvatarImage src={coerceAvatarSrc(user.avatarUrl)} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-foreground-secondary truncate">
            @{user.username}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={mut.send}
        disabled={!canSend || mut.isPending}
        aria-label={
          user.isFriend
            ? `Already friends with ${name}`
            : user.hasPendingRequest
              ? `Request already pending for ${name}`
              : user.isBlocked
                ? `${name} is blocked`
                : `Send friend request to ${name}`
        }
      >
        {statusLabel}
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
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {isLoading && requests.length === 0 ? (
        <p className="text-sm text-foreground-secondary" role="status">
          Loading…
        </p>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-foreground-secondary" role="alert">
            Failed to load {title.toLowerCase()}.
          </p>
          <Button size="sm" variant="outline" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-foreground-secondary">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
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
  const name = displayNameOf(request.requester);
  return (
    <li className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9">
          <AvatarImage
            src={request.requester.avatarUrl ?? undefined}
            alt={name}
          />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-foreground-secondary">
            @{request.requester.userName}
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
  // The row came from `GET /social/friend-requests/incoming`, which is
  // a server-authoritative source. The relationship between the
  // viewer and the requester is by definition `incoming_request`, so
  // the permission guard inside `useRespondFriendRequest` is redundant
  // here — its `useRelationship` round-trip would race against the
  // optimistic UI and leave the buttons enabled but silently no-op.
  // `assumeCanRespond: true` opts the call out of the permission gate.
  const mut = useRespondFriendRequest(request.requesterId, {
    assumeCanRespond: true,
  });

  const handleAccept = useCallback(() => {
    mut.respond({ friendshipId: request.id, action: "accept" });
    push({
      title: "Friend request accepted",
      body: `You are now friends with ${name}.`,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
  }, [mut, request.id, name, push]);

  const handleDecline = useCallback(() => {
    mut.respond({ friendshipId: request.id, action: "decline" });
    push({
      title: "Request declined",
      body: `Friend request from ${name} has been declined.`,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
  }, [mut, request.id, name, push]);

  return (
    <div className="flex gap-2" role="group" aria-label={`Respond to request from ${name}`}>
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={mut.isPending}
        aria-label={`Accept friend request from ${name}`}
      >
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDecline}
        disabled={mut.isPending}
        aria-label={`Decline friend request from ${name}`}
      >
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
  // The row came from `GET /social/friend-requests/sent`, which is a
  // server-authoritative source. The relationship between the viewer
  // and the addressee is by definition `outgoing_request`, so the
  // permission guard inside `useCancelFriendRequest` is redundant
  // here — its `useRelationship` round-trip would race against the
  // optimistic UI and leave the button enabled but silently no-op.
  // `assumeCanCancel: true` opts the call out of the permission gate.
  const mut = useCancelFriendRequest(request.addresseeId, {
    assumeCanCancel: true,
  });

  const handleCancel = useCallback(() => {
    mut.cancel(request.id);
    push({
      title: "Request cancelled",
      body: `Friend request to ${name} has been cancelled.`,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
  }, [mut, request.id, name, push]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCancel}
      disabled={mut.isPending || mut.alreadyCancelled}
      aria-label={`Cancel friend request to ${name}`}
    >
      {mut.alreadyCancelled ? "Already cancelled" : "Cancel Request"}
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
}

const FriendsListPanel = memo(function FriendsListPanel({
  isLoading,
  error,
  retry,
  friends,
  inviteSelections,
  onSelectQuiz,
  quizOptions,
}: FriendsListPanelProps) {
  if (isLoading && friends.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary" role="status">
        Loading friends…
      </p>
    );
  }
  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-foreground-secondary" role="alert">
          Failed to load friends.
        </p>
        <Button size="sm" variant="outline" onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  }
  if (friends.length === 0) {
    return (
      <EmptyFriendsState />
    );
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
    <li className="border border-border rounded-md p-3 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={friend.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-foreground-secondary truncate">
            @{friend.userName}
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <Select value={selection} onValueChange={onSelectQuiz}>
          <SelectTrigger className="w-full md:w-72">
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
          onClick={handleSendInvite}
          disabled={!selection || inviteSent}
          aria-label={`Send quiz invite to ${name}`}
        >
          {inviteSent ? "Sent!" : "Send Invite"}
        </Button>
      </div>
    </li>
  );
});

function EmptyFriendsState() {
  return (
    <p className="text-sm text-foreground-secondary">
      No friends yet. Use Find Friends to add some.
    </p>
  );
}