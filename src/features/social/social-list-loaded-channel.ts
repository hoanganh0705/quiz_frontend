"use client";

export {
closeSocialListLoadedChannel,
getSocialListLoadedChannel,
initSocialListLoadedChannel,
publishSocialListLoaded,
SOCIAL_LIST_LOADED_CHANNEL_NAME,
subscribeSocialListLoaded,
unsubscribeAllSocialListLoadedHandlers,
} from "@/lib/social/social-list-loaded-broadcast-channel";

export type {
SocialListLoadedPayload,
} from "@/lib/social/social-list-loaded-broadcast-channel";

export interface SocialListLoadedEvent {
kind: "list.loaded";
userId: string;
tabId: string;
at: number;
}