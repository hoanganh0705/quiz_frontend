

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useCancelFriendRequest } from "@/features/social/hooks/useCancelFriendRequest";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockCancelFriendRequest = vi.fn();
vi.mock("@/features/social/services", () => ({
cancelFriendRequest: (...args: unknown[]) => mockCancelFriendRequest(...args),
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

describe("useCancelFriendRequest — TKT-6.8.D3", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
mockCancelFriendRequest.mockResolvedValue(undefined);
mockMutate.mockResolvedValue(undefined);
mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

afterEach(() => {
cleanup();
  });

describe("placeholder flag", () => {
it("cancel is a no-op when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");
expect(mockCancelFriendRequest).not.toHaveBeenCalled();
    });
  });

describe("permissions guard", () => {
it("cancel is a no-op when canCancelRequest is false", () => {
mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canCancelRequest: false,
      });
const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");
expect(mockCancelFriendRequest).not.toHaveBeenCalled();
    });
  });

it("cancel is a no-op when targetUserId is null", () => {
const { result } = renderHook(
() => useCancelFriendRequest(null),
{ wrapper: TestSwrProvider },
    );
result.current.cancel("fi-abc");
expect(mockCancelFriendRequest).not.toHaveBeenCalled();
  });

describe("defensive empty friendshipId", () => {
it("cancel is a no-op when friendshipId is empty", () => {
const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("");
expect(mockCancelFriendRequest).not.toHaveBeenCalled();
    });
  });

describe("server success", () => {
it("calls cancelFriendRequest with the friendshipId and revalidates the cache", async () => {
mockCancelFriendRequest.mockResolvedValue(undefined);
const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");

await new Promise((r) => setTimeout(r, 5));
expect(mockCancelFriendRequest).toHaveBeenCalledWith("fi-abc");

expect(mockMutate).toHaveBeenCalledTimes(3);
    });
  });

describe("non-idempotent DELETE terminal state", () => {
it("treats SOCIAL_FRIEND_REQUEST_NOT_FOUND as alreadyCancelled and revalidates the cache", async () => {
mockCancelFriendRequest.mockRejectedValue(
makeApiError(
404,
"SOCIAL_FRIEND_REQUEST_NOT_FOUND",
"Request not pending",
        ),
      );

const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");

await new Promise((r) => setTimeout(r, 10));

expect(result.current.alreadyCancelled).toBe(true);
expect(result.current.error).toBeNull();

expect(mockMutate).toHaveBeenCalledTimes(3);
    });
  });

describe("server error", () => {
it("surfaces SOCIAL_FRIEND_REQUEST_FORBIDDEN as an error code", async () => {
mockCancelFriendRequest.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_REQUEST_FORBIDDEN", "Forbidden"),
      );
const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");

await new Promise((r) => setTimeout(r, 10));
expect(result.current.alreadyCancelled).toBe(false);
expect(result.current.error).toBe("SOCIAL_FRIEND_REQUEST_FORBIDDEN");

expect(mockMutate).not.toHaveBeenCalled();
    });
  });

describe("double-click guard", () => {
it("drops a second cancel() while the first is in-flight", () => {
let resolveFirst!: () => void;
mockCancelFriendRequest.mockReturnValue(
new Promise<void>((r) => {
resolveFirst = r;
        }),
      );

const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");
result.current.cancel("fi-abc");
expect(mockCancelFriendRequest).toHaveBeenCalledTimes(1);

resolveFirst();
    });
  });

describe("assumeCanCancel", () => {
it("dispatches the cancel mutation when canCancelRequest is false but the caller asserts the row came from the sent list", async () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canCancelRequest: false,
      });

const { result } = renderHook(
() =>
useCancelFriendRequest("user-target", {
assumeCanCancel: true,
          }),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");

await new Promise((r) => setTimeout(r, 5));
expect(mockCancelFriendRequest).toHaveBeenCalledWith("fi-abc");
expect(mockMutate).toHaveBeenCalledTimes(3);
    });

it("still no-ops when canCancelRequest is false AND assumeCanCancel is not set", () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canCancelRequest: false,
      });

const { result } = renderHook(
() => useCancelFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.cancel("fi-abc");
expect(mockCancelFriendRequest).not.toHaveBeenCalled();
    });
  });
});
