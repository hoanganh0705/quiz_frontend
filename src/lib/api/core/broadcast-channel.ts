import { createBroadcastChannel } from "@/lib/broadcast/create-channel";
import { getCurrentTabId } from "@/lib/broadcast/tab-id";

export { getCurrentTabId };

export const AUTH_CHANNEL_NAME = "auth";

export type AuthEventType =
  | "TOKEN_REFRESHED"
  | "LOGGED_OUT"
  | "LOGGED_IN"
  | "ACCOUNT_DELETED";

export interface BaseAuthEvent {
  type: AuthEventType;

  tabId: string;

  timestamp: number;
}

export interface TokenRefreshedEvent extends BaseAuthEvent {
  type: "TOKEN_REFRESHED";

  accessToken: string;
}

export interface LoggedOutEvent extends BaseAuthEvent {
  type: "LOGGED_OUT";
}

export interface LoggedInEvent extends BaseAuthEvent {
  type: "LOGGED_IN";

  userId: string;

  accessToken: string;
}

export interface AccountDeletedEvent extends BaseAuthEvent {
  type: "ACCOUNT_DELETED";
}

export type AuthEvent =
  | TokenRefreshedEvent
  | LoggedOutEvent
  | LoggedInEvent
  | AccountDeletedEvent;

const VALID_AUTH_EVENT_TYPES: ReadonlySet<string> = new Set([
  "TOKEN_REFRESHED",
  "LOGGED_OUT",
  "LOGGED_IN",
  "ACCOUNT_DELETED",
]);

function validateAuthEvent(data: unknown): AuthEvent | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidate = data as Partial<AuthEvent>;
  if (!candidate.type || !VALID_AUTH_EVENT_TYPES.has(candidate.type)) {
    return null;
  }
  if (!candidate.tabId || typeof candidate.tabId !== "string") {
    return null;
  }

  return candidate as AuthEvent;
}

const authChannelApi = createBroadcastChannel<AuthEvent>(AUTH_CHANNEL_NAME, {
  validate: validateAuthEvent,
  timestampField: "timestamp",
  getCurrentTabId,
});

export function getAuthChannel(): BroadcastChannel | null {
  return authChannelApi.getChannel();
}

export function closeAuthChannel(): void {
  authChannelApi.closeChannel();
}

type AuthEventHandler = (event: AuthEvent) => void;

export function subscribeToAuthEvents(handler: AuthEventHandler): () => void {
  return authChannelApi.subscribe(handler);
}

export function initAuthChannel(): boolean {
  return authChannelApi.ensureChannel() !== null;
}

export function broadcastAuthEvent(
  event:
    | Omit<TokenRefreshedEvent, "tabId" | "timestamp">
    | Omit<LoggedOutEvent, "tabId" | "timestamp">
    | Omit<LoggedInEvent, "tabId" | "timestamp">
    | Omit<AccountDeletedEvent, "tabId" | "timestamp">,
): void {
  authChannelApi.publish(event);
}

export function broadcastTokenRefreshed(accessToken: string): void {
  broadcastAuthEvent({
    type: "TOKEN_REFRESHED",
    accessToken,
  });
}

export function broadcastLoggedOut(): void {
  broadcastAuthEvent({
    type: "LOGGED_OUT",
  });
}

export function broadcastLoggedIn(userId: string, accessToken: string): void {
  broadcastAuthEvent({
    type: "LOGGED_IN",
    userId,
    accessToken,
  });
}

export function broadcastAccountDeleted(): void {
  broadcastAuthEvent({
    type: "ACCOUNT_DELETED",
  });
}
