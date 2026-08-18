

export const AUTH_CHANNEL_NAME = 'auth';

import { logger } from '@/shared/log';

const TAB_ID_STORAGE_KEY = 'auth_tab_id';

function generateTabId(): string {
return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTabId(): string {
if (typeof sessionStorage === 'undefined') {
return generateTabId();
  }

let tabId = sessionStorage.getItem(TAB_ID_STORAGE_KEY);
if (!tabId) {
tabId = generateTabId();
sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
  }
return tabId;
}

export type AuthEventType =
| 'TOKEN_REFRESHED'
  | 'LOGGED_OUT'
  | 'LOGGED_IN'
  | 'ACCOUNT_DELETED';

export interface BaseAuthEvent {
type: AuthEventType;

tabId: string;

timestamp: number;
}

export interface TokenRefreshedEvent extends BaseAuthEvent {
type: 'TOKEN_REFRESHED';

accessToken: string;
}

export interface LoggedOutEvent extends BaseAuthEvent {
type: 'LOGGED_OUT';
}

export interface LoggedInEvent extends BaseAuthEvent {
type: 'LOGGED_IN';

userId: string;

accessToken: string;
}

export interface AccountDeletedEvent extends BaseAuthEvent {
type: 'ACCOUNT_DELETED';
}

export type AuthEvent =
| TokenRefreshedEvent
  | LoggedOutEvent
  | LoggedInEvent
  | AccountDeletedEvent;

let authChannel: BroadcastChannel | null = null;

let isBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
if (isBroadcastChannelAvailable !== null) {
return isBroadcastChannelAvailable;
  }

if (typeof BroadcastChannel === 'undefined') {
isBroadcastChannelAvailable = false;
return false;
  }

try {

new BroadcastChannel('test');
isBroadcastChannelAvailable = true;
  } catch {
isBroadcastChannelAvailable = false;
  }

return isBroadcastChannelAvailable;
}

export function getAuthChannel(): BroadcastChannel | null {
if (typeof window === 'undefined') {
return null;
  }

if (!checkBroadcastChannelAvailable()) {
return null;
  }

if (authChannel === null) {
authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }

return authChannel;
}

export function closeAuthChannel(): void {
if (authChannel !== null) {
authChannel.close();
authChannel = null;
  }
}

type AuthEventHandler = (event: AuthEvent) => void;

const externalSubscribers = new Set<AuthEventHandler>();

export function subscribeToAuthEvents(handler: AuthEventHandler): () => void {
externalSubscribers.add(handler);

return () => {
externalSubscribers.delete(handler);
  };
}

function dispatchToSubscribers(event: AuthEvent): void {
externalSubscribers.forEach((handler) => {
try {
handler(event);
    } catch (err) {

logger.error('auth.broadcast', 'Error in auth event subscriber', err);
    }
  });
}

function handleMessage(event: MessageEvent): void {

if (!event.data || typeof event.data !== 'object') {
return;
  }

const data = event.data as Partial<AuthEvent>;

if (
!data.type ||
!['TOKEN_REFRESHED', 'LOGGED_OUT', 'LOGGED_IN', 'ACCOUNT_DELETED'].includes(
data.type,
    )
  ) {
return;
  }

if (!data.tabId || typeof data.tabId !== 'string') {
return;
  }

const myTabId = getTabId();
if (data.tabId === myTabId) {
return;
  }

dispatchToSubscribers(data as AuthEvent);
}

export function initAuthChannel(): boolean {
const channel = getAuthChannel();

if (channel === null) {
return false;
  }

if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
channel.addEventListener('message', handleMessage);
(channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

return true;
}

let cachedTabId: string | null = null;

export function getCurrentTabId(): string {
if (cachedTabId === null) {
cachedTabId = getTabId();
  }
return cachedTabId;
}

export function broadcastAuthEvent(
event:
| Omit<TokenRefreshedEvent, 'tabId' | 'timestamp'>
    | Omit<LoggedOutEvent, 'tabId' | 'timestamp'>
    | Omit<LoggedInEvent, 'tabId' | 'timestamp'>
    | Omit<AccountDeletedEvent, 'tabId' | 'timestamp'>,
): void {

initAuthChannel();

const channel = getAuthChannel();
if (channel === null) {

return;
  }

const fullEvent: AuthEvent = {
...event,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  } as AuthEvent;

channel.postMessage(fullEvent);
}

export function broadcastTokenRefreshed(accessToken: string): void {
broadcastAuthEvent({
type: 'TOKEN_REFRESHED',
accessToken,
  });
}

export function broadcastLoggedOut(): void {
broadcastAuthEvent({
type: 'LOGGED_OUT',
  });
}

export function broadcastLoggedIn(userId: string, accessToken: string): void {
broadcastAuthEvent({
type: 'LOGGED_IN',
userId,
accessToken,
  });
}

export function broadcastAccountDeleted(): void {
broadcastAuthEvent({
type: 'ACCOUNT_DELETED',
  });
}

