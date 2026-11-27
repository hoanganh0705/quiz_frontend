import { createBroadcastChannel } from "@/lib/broadcast";

export const TAG_ADMIN_CHANNEL_NAME = "admin-tag" as const;

export type TagAdminEventType = "admin:tag.invalidate";

export type TagAdminMutation = "create" | "update" | "delete" | "restore";

const VALID_MUTATIONS = new Set<TagAdminMutation>([
  "create",
  "update",
  "delete",
  "restore",
]);

export interface BaseTagAdminEvent {
  type: TagAdminEventType;
  tabId: string;
  timestamp: number;
  mutation: TagAdminMutation;
  tagId: string;
}

export interface TagAdminInvalidatedEvent extends BaseTagAdminEvent {
  type: "admin:tag.invalidate";
}

export type TagAdminEvent = TagAdminInvalidatedEvent;

const tagAdminChannel = createBroadcastChannel<TagAdminEvent>(
  TAG_ADMIN_CHANNEL_NAME,
  {
    validate: (data): TagAdminEvent | null => {
      if (typeof data !== "object" || data === null) return null;
      const d = data as Partial<TagAdminInvalidatedEvent>;
      if (d.type !== "admin:tag.invalidate") return null;
      if (typeof d.tabId !== "string" || d.tabId.length === 0) return null;
      if (
        typeof d.mutation !== "string" ||
        !VALID_MUTATIONS.has(d.mutation as TagAdminMutation)
      ) {
        return null;
      }
      if (typeof d.tagId !== "string" || d.tagId.length === 0) return null;
      return d as TagAdminEvent;
    },
  },
);

export function getTagAdminChannel(): BroadcastChannel | null {
  return tagAdminChannel.getChannel();
}

export function closeTagAdminChannel(): void {
  tagAdminChannel.closeChannel();
}

export function subscribeTagAdminInvalidate(
  handler: (event: TagAdminEvent) => void,
): () => void {
  return tagAdminChannel.subscribe(handler);
}

export function initTagAdminChannel(): boolean {
  return tagAdminChannel.ensureChannel() !== null;
}

export function broadcastTagAdminInvalidate(
  mutation: TagAdminMutation,
  tagId: string,
): void {
  if (!tagId || typeof tagId !== "string") {
    return;
  }
  tagAdminChannel.publish({
    type: "admin:tag.invalidate",
    mutation,
    tagId,
  });
}
