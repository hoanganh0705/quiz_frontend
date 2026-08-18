

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useUnfriend } from "@/features/social/hooks/useUnfriend";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUnfriend = vi.fn();
vi.mock("@/features/social/services", () => ({
unfriend: (...args: unknown[]) => mockUnfriend(...args),
}));

const mockUseSocialPermissions = vi.fn();
vi.mock("@/features/social/hooks/useSocialPermissions", () => ({
useSocialPermissions: (...args: unknown[]) => mockUseSocialPermissions(...args),
}));

const mockMutate = vi.fn();
vi.mock("swr", async (importOriginal) => {
const actual = await importOriginal<typeof import("swr")>();
return {
...actual,
useSWRConfig: () => ({ mutate: mockMutate }),
  };
});

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

function makeApiError(status: number, code: string, detail: string): ApiError {
return new ApiError({
response: {
status,
statusText: code,
headers: {},
config: undefined as never,
data: { status, detail, extensions: { code } },
    },
message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0]);
}

function permissionsAllGranted(): ReturnType<typeof mockUseSocialPermissions> {
return {
canFollow: true,
canUnfollow: true,
canFriendRequest: true,
canCancelRequest: true,
canRespond: true,
canUnfriend: true,
canBlock: true,
canUnblock: true,
isSelf: false,
isAuthenticated: true,
  };
}

describe("useUnfriend — TKT-6.8.D4", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
mockUnfriend.mockResolvedValue(undefined);
mockMutate.mockResolvedValue(undefined);
mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

afterEach(() => {
cleanup();
  });

describe("placeholder flag", () => {
it("unfriend is a no-op when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();
expect(mockUnfriend).not.toHaveBeenCalled();
    });
  });

describe("permissions guard", () => {
it("unfriend is a no-op when canUnfriend is false", () => {
mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canUnfriend: false,
      });
const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();
expect(mockUnfriend).not.toHaveBeenCalled();
    });
  });

it("unfriend is a no-op when targetUserId is null", () => {
const { result } = renderHook(
() => useUnfriend(null),
{ wrapper: TestSwrProvider },
    );
result.current.unfriend();
expect(mockUnfriend).not.toHaveBeenCalled();
  });

describe("server success", () => {
it("calls unfriend with the userId and revalidates the cache", async () => {
mockUnfriend.mockResolvedValue(undefined);
const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();

await new Promise((r) => setTimeout(r, 5));
expect(mockUnfriend).toHaveBeenCalledWith("user-target");

expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

describe("non-idempotent DELETE terminal state", () => {
it("treats SOCIAL_FRIENDSHIP_NOT_FOUND as alreadyNotFriends and revalidates the cache", async () => {
mockUnfriend.mockRejectedValue(
makeApiError(
404,
"SOCIAL_FRIENDSHIP_NOT_FOUND",
"Not friends",
        ),
      );

const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();

await new Promise((r) => setTimeout(r, 10));
expect(result.current.alreadyNotFriends).toBe(true);
expect(result.current.error).toBeNull();

expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

describe("server error", () => {
it("surfaces a forbidden error code", async () => {
mockUnfriend.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_LIST_FORBIDDEN", "Forbidden"),
      );
const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();

await new Promise((r) => setTimeout(r, 10));
expect(result.current.alreadyNotFriends).toBe(false);
expect(result.current.error).toBe("SOCIAL_FRIEND_LIST_FORBIDDEN");
expect(mockMutate).not.toHaveBeenCalled();
    });
  });

describe("double-click guard", () => {
it("drops a second unfriend() while the first is in-flight", () => {
let resolveFirst!: () => void;
mockUnfriend.mockReturnValue(
new Promise<void>((r) => {
resolveFirst = r;
        }),
      );

const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();
result.current.unfriend();
expect(mockUnfriend).toHaveBeenCalledTimes(1);

resolveFirst();
    });
  });

describe("assumeCanUnfriend", () => {
it("dispatches the unfriend mutation when canUnfriend is false but the caller asserts the row came from the friends list", async () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canUnfriend: false,
      });

const { result } = renderHook(
() =>
useUnfriend("user-target", {
assumeCanUnfriend: true,
          }),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();

await new Promise((r) => setTimeout(r, 5));
expect(mockUnfriend).toHaveBeenCalledWith("user-target");
expect(mockMutate).toHaveBeenCalledTimes(2);
    });

it("still no-ops when canUnfriend is false AND assumeCanUnfriend is not set", () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canUnfriend: false,
      });

const { result } = renderHook(
() => useUnfriend("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.unfriend();
expect(mockUnfriend).not.toHaveBeenCalled();
    });
  });
});
