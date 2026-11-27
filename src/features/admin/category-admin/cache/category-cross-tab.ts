import { createBroadcastChannel } from "@/lib/broadcast";

export const CATEGORY_ADMIN_CHANNEL_NAME = "admin-category" as const;

export type CategoryAdminEventType = "admin:category.invalidate";

export type CategoryAdminMutation = "create" | "update" | "delete" | "restore";

const VALID_MUTATIONS = new Set<CategoryAdminMutation>([
  "create",
  "update",
  "delete",
  "restore",
]);

export interface BaseCategoryAdminEvent {
  type: CategoryAdminEventType;
  tabId: string;
  timestamp: number;
  mutation: CategoryAdminMutation;
  categoryId: string;
}

export interface CategoryAdminInvalidatedEvent extends BaseCategoryAdminEvent {
  type: "admin:category.invalidate";
}

export type CategoryAdminEvent = CategoryAdminInvalidatedEvent;

const categoryAdminChannel = createBroadcastChannel<CategoryAdminEvent>(
  CATEGORY_ADMIN_CHANNEL_NAME,
  {
    validate: (data): CategoryAdminEvent | null => {
      if (typeof data !== "object" || data === null) return null;
      const d = data as Partial<CategoryAdminInvalidatedEvent>;
      if (d.type !== "admin:category.invalidate") return null;
      if (typeof d.tabId !== "string" || d.tabId.length === 0) return null;
      if (
        typeof d.mutation !== "string" ||
        !VALID_MUTATIONS.has(d.mutation as CategoryAdminMutation)
      ) {
        return null;
      }
      if (typeof d.categoryId !== "string" || d.categoryId.length === 0) {
        return null;
      }
      return d as CategoryAdminEvent;
    },
  },
);

export function getCategoryAdminChannel(): BroadcastChannel | null {
  return categoryAdminChannel.getChannel();
}

export function closeCategoryAdminChannel(): void {
  categoryAdminChannel.closeChannel();
}

export function subscribeCategoryAdminInvalidate(
  handler: (event: CategoryAdminEvent) => void,
): () => void {
  return categoryAdminChannel.subscribe(handler);
}

export function initCategoryAdminChannel(): boolean {
  return categoryAdminChannel.ensureChannel() !== null;
}

export function broadcastCategoryAdminInvalidate(
  mutation: CategoryAdminMutation,
  categoryId: string,
): void {
  if (!categoryId || typeof categoryId !== "string") {
    return;
  }
  categoryAdminChannel.publish({
    type: "admin:category.invalidate",
    mutation,
    categoryId,
  });
}
