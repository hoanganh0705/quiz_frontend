

import { getCurrentTabId as defaultGetCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

export type ChannelValidator<TEvent> = (
data: unknown,
) => TEvent | null;

export type ChannelSubscriber<TEvent> = (event: TEvent) => void;

export interface BroadcastChannelApi<TEvent> {

readonly name: string;

isAvailable(): boolean;

getChannel(): BroadcastChannel | null;

ensureChannel(): BroadcastChannel | null;

closeChannel(): void;

unsubscribeAll(): void;

subscribe(handler: ChannelSubscriber<TEvent>): () => void;

publish: (event: object) => void;
}

let cachedAvailability: boolean | null = null;

function isBroadcastChannelAvailable(): boolean {
if (cachedAvailability !== null) return cachedAvailability;
if (typeof BroadcastChannel === 'undefined') {
cachedAvailability = false;
return false;
  }
try {

new BroadcastChannel('factory-probe');
cachedAvailability = true;
  } catch {
cachedAvailability = false;
  }
return cachedAvailability;
}

export function __resetBroadcastAvailabilityForTest(): void {
cachedAvailability = null;
}

export function createBroadcastChannel<TEvent extends { tabId: string }>(
name: string,
options: {
validate: ChannelValidator<TEvent>;

timestampField?: 'timestamp' | 'at';

getCurrentTabId?: () => string;
  },
): BroadcastChannelApi<TEvent> {
const stampField = options.timestampField ?? 'timestamp';
const readTabId = options.getCurrentTabId ?? defaultGetCurrentTabId;

let channel: BroadcastChannel | null = null;
const subscribers = new Set<ChannelSubscriber<TEvent>>();
let listenerInstalled = false;

function getChannel(): BroadcastChannel | null {
if (typeof window === 'undefined') return null;
if (!isBroadcastChannelAvailable()) return null;
if (channel === null) {
channel = new BroadcastChannel(name);
    }
return channel;
  }

function installListener(): void {
if (listenerInstalled) return;
const ch = getChannel();
if (ch === null) return;
ch.addEventListener('message', (event: MessageEvent) => {
const validated = options.validate(event.data);
if (validated === null) return;

if (validated.tabId === readTabId()) return;
dispatchToSubscribers(validated);
    });
listenerInstalled = true;
  }

function dispatchToSubscribers(event: TEvent): void {
subscribers.forEach((handler) => {
try {
handler(event);
      } catch (err) {

logger.error('broadcast.subscriber', `error in ${name}`, err);
      }
    });
  }

function subscribe(handler: ChannelSubscriber<TEvent>): () => void {

installListener();
subscribers.add(handler);
return () => {
subscribers.delete(handler);
    };
  }

function publish(event: object): void {

const ch = getChannel();
if (ch === null) return;

installListener();
const fullEvent = {
...event,
tabId: readTabId(),
[stampField]: Date.now(),
    } as TEvent;
ch.postMessage(fullEvent);
  }

function ensureChannel(): BroadcastChannel | null {
return getChannel();
  }

function closeChannel(): void {
if (channel !== null) {
channel.close();
channel = null;
    }
listenerInstalled = false;
subscribers.clear();
  }

function unsubscribeAll(): void {
subscribers.clear();
  }

return {
name,
isAvailable: isBroadcastChannelAvailable,
getChannel,
ensureChannel,
closeChannel,
unsubscribeAll,
subscribe,
publish,
  };
}
