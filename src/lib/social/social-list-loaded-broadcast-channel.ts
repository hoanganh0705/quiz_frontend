

import { createBroadcastChannel } from "@/lib/broadcast";

export const SOCIAL_LIST_LOADED_CHANNEL_NAME = "social/list-loaded";

export interface SocialListLoadedPayload {

kind: "followers" | "following" | "friends" | "blocked";

targetUserId: string;

offset: number;

limit: number;

at: number;

tabId: string;
}

const SOCIAL_LIST_LOADED_VALID_KINDS = new Set<SocialListLoadedPayload["kind"]>(
["followers", "following", "friends", "blocked"],
);

let cachedSocialListLoadedTabId: string | null = null;

function getSocialListLoadedTabId(): string {
if (cachedSocialListLoadedTabId !== null) return cachedSocialListLoadedTabId;
if (typeof sessionStorage === "undefined") {
cachedSocialListLoadedTabId = "ssr";
return cachedSocialListLoadedTabId;
  }
const KEY = "social:list-loaded:tabId";
let tabId = sessionStorage.getItem(KEY);
if (tabId === null) {
tabId =
typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
sessionStorage.setItem(KEY, tabId);
  }
cachedSocialListLoadedTabId = tabId;
return cachedSocialListLoadedTabId;
}

const socialListLoadedChannel = createBroadcastChannel<SocialListLoadedPayload>(
SOCIAL_LIST_LOADED_CHANNEL_NAME,
{
validate: (data): SocialListLoadedPayload | null => {
if (typeof data !== "object" || data === null) return null;
const d = data as Partial<SocialListLoadedPayload>;
if (
typeof d.kind !== "string" ||
!SOCIAL_LIST_LOADED_VALID_KINDS.has(
d.kind as SocialListLoadedPayload["kind"],
        )
      ) {
return null;
      }
if (typeof d.targetUserId !== "string") return null;
if (typeof d.offset !== "number") return null;
if (typeof d.limit !== "number") return null;
if (typeof d.at !== "number") return null;
if (typeof d.tabId !== "string") return null;
return d as SocialListLoadedPayload;
    },
timestampField: "at",
getCurrentTabId: getSocialListLoadedTabId,
  },
);

export function getSocialListLoadedChannel(): BroadcastChannel | null {
return socialListLoadedChannel.getChannel();
}

export function closeSocialListLoadedChannel(): void {
socialListLoadedChannel.closeChannel();
}

export function initSocialListLoadedChannel(): boolean {
return socialListLoadedChannel.isAvailable();
}

export function publishSocialListLoaded(
input:
| Pick<
SocialListLoadedPayload,
"kind" | "targetUserId" | "offset" | "limit"
      >
    | (Pick<SocialListLoadedPayload, "kind"> & { userId: string }),
): boolean {

const targetUserId =
"targetUserId" in input
? input.targetUserId
: "userId" in input
? (input as { userId: string }).userId
: "";
const offset = "offset" in input ? input.offset : 0;
const limit = "limit" in input ? input.limit : 20;

if (!socialListLoadedChannel.isAvailable()) return false;

const ch = socialListLoadedChannel.getChannel();
if (ch === null) return false;
ch.postMessage({
kind: input.kind,
targetUserId,
userId: targetUserId,
offset,
limit,
tabId: getSocialListLoadedTabId(),
at: Date.now(),
  });
return true;
}

export function subscribeSocialListLoaded(
handler: (event: SocialListLoadedPayload) => void,
): () => void {
return socialListLoadedChannel.subscribe(handler);
}

export function unsubscribeAllSocialListLoadedHandlers(): void {
socialListLoadedChannel.unsubscribeAll();
}

export function installSocialListLoadedLogoutReset(): () => void {
if (typeof window === "undefined") {
return () => undefined;
  }
if (typeof socialListLoadedLogoutResetState.cleanup === "function") {
return socialListLoadedLogoutResetState.cleanup;
  }
const handler = (): void => {
unsubscribeAllSocialListLoadedHandlers();
  };
window.addEventListener("auth-state-change", handler);
const cleanup = (): void => {
window.removeEventListener("auth-state-change", handler);
socialListLoadedLogoutResetState.cleanup = null;
  };
socialListLoadedLogoutResetState.cleanup = cleanup;
return cleanup;
}

const socialListLoadedLogoutResetState: {
cleanup: (() => void) | null;
} = {
cleanup: null,
};
