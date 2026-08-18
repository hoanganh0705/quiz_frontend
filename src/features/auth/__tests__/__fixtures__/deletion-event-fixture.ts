

import type { AccountDeletedEvent } from "@/lib/api/core/broadcast-channel";

export const ACCOUNT_DELETED_EVENT: AccountDeletedEvent = {
type: "ACCOUNT_DELETED",
tabId: "tab-of-origin",
timestamp: 1_700_000_000_000,
};
