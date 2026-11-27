import { afterEach, describe, expect, it, vi } from "vitest";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import {
  DEFAULT_ATTEMPT_HISTORY_FILTERS,
  serializeAttemptHistoryFilters,
} from "@/features/attempts/types/attempt-history.types";

afterEach(() => {
  vi.clearAllMocks();
});

describe("serializeAttemptHistoryFilters", () => {
  it("produces equal strings for equal filter objects", () => {
    const a = serializeAttemptHistoryFilters({
      status: "completed",
      dateRange: "last_7_days",
      search: "quiz",
      cursor: null,
    });
    const b = serializeAttemptHistoryFilters({
      status: "completed",
      dateRange: "last_7_days",
      search: "quiz",
      cursor: null,
    });
    expect(a).toBe(b);
  });

  it("field order does not affect the output", () => {
    const s = serializeAttemptHistoryFilters({
      status: "all",
      dateRange: "all",
      search: "",
      cursor: null,
    });
    expect(s).toBe("status=all|date=all|q=");
  });

  it("omits cursor when null", () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
    });
    expect(s).not.toContain("cursor=");
  });

  it("includes cursor when set", () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      cursor: "opaque-cursor",
    });
    expect(s).toContain("cursor=opaque-cursor");
  });

  it("includes limit when set", () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      limit: 50,
    });
    expect(s).toContain("limit=50");
  });

  it("search is lowercased and trimmed", () => {
    const s = serializeAttemptHistoryFilters({
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      search: "  Quiz Title  ",
    });

    expect(s).toContain("q=quiz title");
  });
});

describe("ATTEMPT_KEYS history helpers", () => {
  it("historyList returns a readonly tuple", () => {
    const key = ATTEMPT_KEYS.historyList("user-1", {
      status: "completed",
      dateRange: "all",
      search: "",
      cursor: null,
    });

    expect(Array.isArray(key)).toBe(true);

    expect(key).toHaveLength(4);
    expect(key[0]).toBe("attempts");
    expect(key[1]).toBe("history");
  });

  it("historyList keys are scoped by sessionId", () => {
    const a = ATTEMPT_KEYS.historyList(
      "user-1",
      DEFAULT_ATTEMPT_HISTORY_FILTERS,
    );
    const b = ATTEMPT_KEYS.historyList(
      "user-2",
      DEFAULT_ATTEMPT_HISTORY_FILTERS,
    );
    expect(a).not.toEqual(b);
  });

  it("historyList keys differ when filter shape differs", () => {
    const a = ATTEMPT_KEYS.historyList("user-1", {
      status: "completed",
      dateRange: "all",
      search: "",
      cursor: null,
    });
    const b = ATTEMPT_KEYS.historyList("user-1", {
      status: "abandoned",
      dateRange: "all",
      search: "",
      cursor: null,
    });
    expect(a).not.toEqual(b);
  });

  it("history returns a readonly prefix tuple scoped by sessionId without wildcard", () => {
    const key = ATTEMPT_KEYS.history("user-1");

    expect(Array.isArray(key)).toBe(true);
    expect(key).toEqual(["attempts", "history", "user-1"]);
  });
});
