/**
 * `features/admin/category-admin/cache/category-cross-tab.ts`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.G2 (analogous to TKT-7.3.G2).
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for category admin mutations. When
 * an admin performs a category mutation (create / update / delete /
 * restore) in one tab, every other tab that has `/admin/categories`
 * open (or any other surface reading `categories:*` SWR keys) must
 * revalidate its caches so the new state shows up on the next render.
 *
 * ## Design
 *
 * Mirrors the tag-admin cross-tab pattern
 * (`features/admin/tag-admin/cache/tag-cross-tab.ts`):
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-category'`
 *     so the tab-event payloads are independent of the auth, bookmark,
 *     and tag channels.
 *   - singleton channel instance (lazily created on first broadcast)
 *     so listeners register exactly once per tab.
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast.
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation is
 *     unaffected.
 *   - external subscribers via `subscribeCategoryAdminInvalidate(handler)`
 *     — any caller can listen without coupling to the channel internals.
 *
 * ## Event shape
 *
 * Single event type: `phase7:admin.category.invalidate`. The payload
 * carries `mutation` (the kind of mutation that triggered the
 * revalidation) and `categoryId` (the affected category id). The
 * receiving tab invalidates the admin list and public category
 * caches; the exact keys are documented in `category-cache-keys.ts`
 * and revalidated via `invalidateCategoryAdminList` +
 * `invalidatePublicCategoryCaches`.
 *
 * ## Wiring
 *
 * Every mutation hook (`useCreateCategory`, `useUpdateCategory`,
 * `useDeleteCategory`, `useRestoreCategory`) calls
 * `broadcastCategoryAdminInvalidate(...)` once on success. The
 * `CategoryAdminPage` (or any tab receiving the event) listens via
 * `subscribeCategoryAdminInvalidate(handler)` and invalidates the
 * documented caches — the page wiring lives in `CategoryAdminPage`'s
 * mount effect (TKT-7.4.F2 follow-up).
 */

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

// ─── Channel name ───────────────────────────────────────────────────────────

/**
 * Channel name used for all category admin broadcasts. Distinct from
 * the auth (`'auth'`), bookmark (`'bookmarks'`), and tag admin
 * (`'phase7-admin-tag'`) channels so the four channels' messages are
 * independent BroadcastChannels at the browser level.
 */
export const CATEGORY_ADMIN_CHANNEL_NAME = 'phase7-admin-category' as const;

// ─── Event types ────────────────────────────────────────────────────────────

export type CategoryAdminEventType = 'phase7:admin.category.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 */
export type CategoryAdminMutation = 'create' | 'update' | 'delete' | 'restore';

export interface BaseCategoryAdminEvent {
  type: CategoryAdminEventType;
  tabId: string;
  timestamp: number;
  mutation: CategoryAdminMutation;
  categoryId: string;
}

/**
 * Event emitted when any category admin mutation has been confirmed by
 * the server. Receiving tabs revalidate the admin category list and
 * the public category caches so the next render reflects the new
 * state.
 */
export interface CategoryAdminInvalidatedEvent extends BaseCategoryAdminEvent {
  type: 'phase7:admin.category.invalidate';
}

export type CategoryAdminEvent = CategoryAdminInvalidatedEvent;

// ─── Channel singleton ──────────────────────────────────────────────────────

let categoryAdminChannel: BroadcastChannel | null = null;

let isCategoryAdminBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
  if (isCategoryAdminBroadcastChannelAvailable !== null) {
    return isCategoryAdminBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isCategoryAdminBroadcastChannelAvailable = false;
    return false;
  }

  try {
    new BroadcastChannel('test');
    isCategoryAdminBroadcastChannelAvailable = true;
  } catch {
    isCategoryAdminBroadcastChannelAvailable = false;
  }

  return isCategoryAdminBroadcastChannelAvailable;
}

export function getCategoryAdminChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (categoryAdminChannel === null) {
    categoryAdminChannel = new BroadcastChannel(CATEGORY_ADMIN_CHANNEL_NAME);
  }

  return categoryAdminChannel;
}

export function closeCategoryAdminChannel(): void {
  if (categoryAdminChannel !== null) {
    categoryAdminChannel.close();
    categoryAdminChannel = null;
  }
}

// ─── External subscribers ──────────────────────────────────────────────────

type CategoryAdminEventHandler = (event: CategoryAdminEvent) => void;

const categoryAdminSubscribers = new Set<CategoryAdminEventHandler>();

export function subscribeCategoryAdminInvalidate(
  handler: CategoryAdminEventHandler,
): () => void {
  categoryAdminSubscribers.add(handler);

  return () => {
    categoryAdminSubscribers.delete(handler);
  };
}

function dispatchToCategoryAdminSubscribers(event: CategoryAdminEvent): void {
  categoryAdminSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      logger.error(
        'admin.category.broadcast',
        'Error in category admin event subscriber',
        err,
      );
    }
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

function handleCategoryAdminMessage(event: MessageEvent): void {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<CategoryAdminInvalidatedEvent>;

  if (!data.type || data.type !== 'phase7:admin.category.invalidate') {
    return;
  }

  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  if (
    !data.mutation ||
    !['create', 'update', 'delete', 'restore'].includes(data.mutation)
  ) {
    return;
  }

  if (!data.categoryId || typeof data.categoryId !== 'string') {
    return;
  }

  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  dispatchToCategoryAdminSubscribers(data as CategoryAdminEvent);
}

// ─── Channel initialization ─────────────────────────────────────────────────

export function initCategoryAdminChannel(): boolean {
  const channel = getCategoryAdminChannel();

  if (channel === null) {
    return false;
  }

  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleCategoryAdminMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Broadcast a category admin invalidation to all other tabs.
 *
 * Called by the four mutation hooks (`useCreateCategory`,
 * `useUpdateCategory`, `useDeleteCategory`, `useRestoreCategory`)
 * once on success. Receiving tabs revalidate the admin category list
 * (`CATEGORY_ADMIN_LIST_KEY`) and the public category caches via the
 * helpers in `category-cache-keys.ts`.
 *
 * @param mutation — the mutation that triggered the broadcast.
 * @param categoryId — the affected category id.
 */
export function broadcastCategoryAdminInvalidate(
  mutation: CategoryAdminMutation,
  categoryId: string,
): void {
  initCategoryAdminChannel();

  const channel = getCategoryAdminChannel();
  if (channel === null) {
    return;
  }

  if (!categoryId || typeof categoryId !== 'string') {
    return;
  }

  const fullEvent: CategoryAdminInvalidatedEvent = {
    type: 'phase7:admin.category.invalidate',
    mutation,
    categoryId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}