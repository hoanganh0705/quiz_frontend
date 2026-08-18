

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useRespondFriendRequest } from "@/features/social/hooks/useRespondFriendRequest";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockRespondFriendRequest = vi.fn();
vi.mock("@/features/social/services", () => ({
respondFriendRequest: (...args: unknown[]) => mockRespondFriendRequest(...args),
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

describe("useRespondFriendRequest — TKT-6.8.D2", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
mockRespondFriendRequest.mockResolvedValue(undefined);
mockMutate.mockResolvedValue(undefined);
mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

afterEach(() => {
cleanup();
  });

describe("placeholder flag", () => {
it("respond is a no-op when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
      });
expect(mockRespondFriendRequest).not.toHaveBeenCalled();
    });
  });

describe("permissions guard", () => {
it("respond is a no-op when canRespond is false", () => {
mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canRespond: false,
      });
const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
      });
expect(mockRespondFriendRequest).not.toHaveBeenCalled();
    });
  });

it("respond is a no-op when targetUserId is null", () => {
const { result } = renderHook(
() => useRespondFriendRequest(null),
{ wrapper: TestSwrProvider },
    );
result.current.respond({ friendshipId: "fi-abc", action: "accept" });
expect(mockRespondFriendRequest).not.toHaveBeenCalled();
  });

describe("server success", () => {
it("calls respondFriendRequest with the in-memory friendshipId and 'accept' action", async () => {
mockRespondFriendRequest.mockResolvedValue(undefined);
const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
        });
      });

await waitFor(() =>
expect(mockRespondFriendRequest).toHaveBeenCalledWith(
"fi-abc",
"accept",
        ),
      );

expect(mockMutate).toHaveBeenCalledTimes(3);
    });

it("forwards the 'decline' action verbatim", async () => {
mockRespondFriendRequest.mockResolvedValue(undefined);
const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.respond({
friendshipId: "fi-abc",
action: "decline",
        });
      });

await waitFor(() =>
expect(mockRespondFriendRequest).toHaveBeenCalledWith(
"fi-abc",
"decline",
        ),
      );
    });
  });

describe("server error", () => {
it("surfaces the error code", async () => {
mockRespondFriendRequest.mockRejectedValue(
makeApiError(404, "SOCIAL_FRIEND_REQUEST_NOT_FOUND", "Not found"),
      );
const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
        });
      });

await waitFor(() =>
expect(result.current.error).toBe(
"SOCIAL_FRIEND_REQUEST_NOT_FOUND",
        ),
      );
expect(mockMutate).not.toHaveBeenCalled();
    });
  });

describe("double-click guard", () => {
it("drops a second respond() while the first is in-flight", async () => {
let resolveFirst!: () => void;
mockRespondFriendRequest.mockReturnValue(
new Promise<void>((r) => {
resolveFirst = r;
        }),
      );

const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
result.current.respond({ friendshipId: "fi-abc", action: "accept" });
await Promise.resolve();
      });
result.current.respond({ friendshipId: "fi-abc", action: "decline" });
expect(mockRespondFriendRequest).toHaveBeenCalledTimes(1);

resolveFirst();
await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

describe("assumeCanRespond", () => {
it("dispatches the respond mutation when canRespond is false but the caller asserts the row came from the incoming list", async () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canRespond: false,
      });

const { result } = renderHook(
() =>
useRespondFriendRequest("user-target", {
assumeCanRespond: true,
          }),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
        });
      });

await waitFor(() =>
expect(mockRespondFriendRequest).toHaveBeenCalledWith(
"fi-abc",
"accept",
        ),
      );
    });

it("still no-ops when canRespond is false AND assumeCanRespond is not set", () => {

mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canRespond: false,
      });

const { result } = renderHook(
() => useRespondFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.respond({
friendshipId: "fi-abc",
action: "accept",
      });
expect(mockRespondFriendRequest).not.toHaveBeenCalled();
    });
  });
});
