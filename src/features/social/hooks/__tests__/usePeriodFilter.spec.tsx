

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
let mockSearchParams: URLSearchParams = new URLSearchParams();
let mockPathname = "/social/me/analytics";

vi.mock("next/navigation", () => ({
useRouter: () => ({ replace: mockReplace }),
usePathname: () => mockPathname,
useSearchParams: () => mockSearchParams,
}));

import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";

function buildHref(replaceArg: string): { pathname: string; query: string } {
const qIndex = replaceArg.indexOf("?");
if (qIndex === -1) return { pathname: replaceArg, query: "" };
return {
pathname: replaceArg.slice(0, qIndex),
query: replaceArg.slice(qIndex + 1),
  };
}

describe("usePeriodFilter", () => {
beforeEach(() => {
mockReplace.mockReset();
mockSearchParams = new URLSearchParams();
mockPathname = "/social/me/analytics";
  });

afterEach(() => {
vi.clearAllMocks();
  });

it("returns the default period when the URL is empty", () => {
const { result } = renderHook(() => usePeriodFilter());
expect(result.current.period).toBe("week");
expect(result.current.isValid).toBe(false);
  });

it("reads an explicit period from the URL", () => {
mockSearchParams = new URLSearchParams("period=month");
const { result } = renderHook(() => usePeriodFilter());
expect(result.current.period).toBe("month");
expect(result.current.isValid).toBe(true);
  });

it("falls back to the default for an unknown period value", () => {
mockSearchParams = new URLSearchParams("period=garbage");
const { result } = renderHook(() => usePeriodFilter());
expect(result.current.period).toBe("week");
expect(result.current.isValid).toBe(false);
  });

it("falls back to the default for an empty period value", () => {
mockSearchParams = new URLSearchParams("period=");
const { result } = renderHook(() => usePeriodFilter());
expect(result.current.period).toBe("week");
expect(result.current.isValid).toBe(false);
  });

it("setPeriod writes the next period to the URL", () => {
const { result } = renderHook(() => usePeriodFilter());
act(() => result.current.setPeriod("month"));
expect(mockReplace).toHaveBeenCalledTimes(1);
const [href, options] = mockReplace.mock.calls[0];
const { query } = buildHref(href as string);
expect(new URLSearchParams(query).get("period")).toBe("month");
expect(options).toEqual({ scroll: false });
  });

it("setPeriod('week') (the default) deletes the period key", () => {
mockSearchParams = new URLSearchParams("period=month");
const { result } = renderHook(() => usePeriodFilter());
act(() => result.current.setPeriod("week"));
const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
expect(new URLSearchParams(query).has("period")).toBe(false);
  });

it("setPeriod does NOT call window.scrollTo (scroll-preservation invariant)", () => {
const scrollToSpy = vi.fn();
const originalScrollTo = window.scrollTo;
window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo;
try {
const { result } = renderHook(() => usePeriodFilter());
act(() => result.current.setPeriod("month"));
act(() => result.current.setPeriod("all"));
act(() => result.current.setPeriod("week"));
expect(scrollToSpy).not.toHaveBeenCalled();
    } finally {
window.scrollTo = originalScrollTo;
    }
  });

it("reset removes the period URL key", () => {
mockSearchParams = new URLSearchParams("period=month&keep=1");
const { result } = renderHook(() => usePeriodFilter());
act(() => result.current.reset());
const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
const params = new URLSearchParams(query);
expect(params.has("period")).toBe(false);
expect(params.get("keep")).toBe("1");
  });

it("preserves unrelated URL keys when the period changes", () => {
mockSearchParams = new URLSearchParams("keep=1&period=week");
const { result } = renderHook(() => usePeriodFilter());
act(() => result.current.setPeriod("month"));
const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
const params = new URLSearchParams(query);
expect(params.get("period")).toBe("month");
expect(params.get("keep")).toBe("1");
  });
});