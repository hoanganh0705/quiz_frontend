const TAB_ID_STORAGE_KEY = "auth_tab_id";

function generateTabId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readOrCreateTabId(): string {
  if (typeof sessionStorage === "undefined") {
    return generateTabId();
  }

  let tabId = sessionStorage.getItem(TAB_ID_STORAGE_KEY);
  if (!tabId) {
    tabId = generateTabId();
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
  }
  return tabId;
}

let cachedTabId: string | null = null;

/**
 * Returns a stable per-tab identifier used to filter out self-originated
 * BroadcastChannel messages across all cross-tab sync channels.
 */
export function getCurrentTabId(): string {
  if (cachedTabId === null) {
    cachedTabId = readOrCreateTabId();
  }
  return cachedTabId;
}
