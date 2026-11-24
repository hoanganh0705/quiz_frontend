import { describe, expect, it, vi, beforeEach } from "vitest";
import { listNotifications } from "../notifications.service";
import * as api from "@/lib/api";

describe("notifications.service - listNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full response envelope including data array and meta pagination", async () => {
    const mockEnvelope = {
      data: [
        {
          notificationId: "notif-1",
          type: "comment_reply",
          title: "Test Notification",
          isRead: false,
          createdAt: "2026-06-30T09:00:00.000Z",
        },
      ],
      meta: {
        timestamp: "2026-11-21T00:00:00.000Z",
        pagination: {
          kind: "cursor",
          limit: 20,
          hasNextPage: false,
          nextCursor: null,
        },
      },
    };

    const mockGetNotificationsFn = vi.fn().mockResolvedValue(mockEnvelope);
    vi.spyOn(api, "getNotifications").mockReturnValue({
      getNotifications: mockGetNotificationsFn,
    } as any);

    const result = await listNotifications({ limit: 5 });

    expect(mockGetNotificationsFn).toHaveBeenCalledWith({ limit: 5 });
    expect(result).toEqual(mockEnvelope);
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("meta");
    expect(Array.isArray((result as any).data)).toBe(true);
    expect((result as any).data).toHaveLength(1);
    expect((result as any).meta.pagination.limit).toBe(20);
  });
});
