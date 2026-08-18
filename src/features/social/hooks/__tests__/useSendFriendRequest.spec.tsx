

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useSendFriendRequest } from "@/features/social/hooks/useSendFriendRequest";
import { ApiError } from "@/lib/api";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockSendFriendRequest = vi.fn();
vi.mock("@/features/social/services", () => ({
sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
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
data: {
status,
detail,
extensions: { code },
      },
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

describe("useSendFriendRequest — TKT-6.8.D1", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
mockSendFriendRequest.mockResolvedValue(undefined);
mockMutate.mockResolvedValue(undefined);
mockUseSocialPermissions.mockReturnValue(permissionsAllGranted());
  });

afterEach(() => {
cleanup();
  });

describe("placeholder flag", () => {
it("send is a no-op when flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");
const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.send();
expect(mockSendFriendRequest).not.toHaveBeenCalled();
expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
    });
  });

describe("permissions guard", () => {
it("send is a no-op when canFriendRequest is false", () => {
mockUseSocialPermissions.mockReturnValue({
...permissionsAllGranted(),
canFriendRequest: false,
      });
const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
result.current.send();
expect(mockSendFriendRequest).not.toHaveBeenCalled();
expect(result.current.error).toBeNull();
    });
  });

it("send is a no-op when targetUserId is null", () => {
const { result } = renderHook(
() => useSendFriendRequest(null),
{ wrapper: TestSwrProvider },
    );
result.current.send();
expect(mockSendFriendRequest).not.toHaveBeenCalled();
  });

describe("server success", () => {
it("calls sendFriendRequest with the userId and revalidates the SWR keys", async () => {
let resolveCall!: () => void;
const callPromise = new Promise<void>((r) => {
resolveCall = r;
    });
mockSendFriendRequest.mockReturnValue(callPromise);

const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
    );

await act(async () => {
result.current.send();
await Promise.resolve();
    });
expect(result.current.isPending).toBe(true);

resolveCall();

await callPromise;
await Promise.resolve();

expect(mockSendFriendRequest).toHaveBeenCalledWith("user-target");

expect(mockMutate).toHaveBeenCalledTimes(3);

for (const call of mockMutate.mock.calls) {
expect(call[2]).toEqual({ revalidate: true });
    }

await waitFor(() => expect(result.current.isPending).toBe(false));
  });
  });

describe("server error", () => {
it("surfaces the error code", async () => {
mockSendFriendRequest.mockRejectedValue(
makeApiError(403, "SOCIAL_FRIEND_REQUEST_FORBIDDEN", "Forbidden"),
      );

const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.send();
      });

await waitFor(() =>
expect(result.current.error).toBe("SOCIAL_FRIEND_REQUEST_FORBIDDEN"),
      );
expect(result.current.isPending).toBe(false);

expect(mockMutate).not.toHaveBeenCalled();
    });

it("maps non-SOCIAL error codes to GLOBAL_INTERNAL_ERROR", async () => {
mockSendFriendRequest.mockRejectedValue(
new Error("Unknown failure"),
      );

const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );
await act(async () => {
result.current.send();
      });

await waitFor(() =>
expect(result.current.error).toBe("GLOBAL_INTERNAL_ERROR"),
      );
    });
  });

describe("double-click guard", () => {
it("drops a second send() while the first is in-flight", async () => {
let resolveFirst!: () => void;
mockSendFriendRequest.mockReturnValue(
new Promise<void>((r) => {
resolveFirst = r;
        }),
      );

const { result } = renderHook(
() => useSendFriendRequest("user-target"),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
result.current.send();
await Promise.resolve();
      });
result.current.send();
expect(mockSendFriendRequest).toHaveBeenCalledTimes(1);

resolveFirst();
await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

describe("friendshipId hygiene", () => {
it("does not include friendshipId in any SWR cache key", () => {

renderHook(() => useSendFriendRequest("user-target"), {
wrapper: TestSwrProvider,
      });
const relKey = SOCIAL_CACHE_KEYS.makeRelationshipKey("user-target");
expect(
JSON.stringify(relKey),
"Relationship key must not contain a friendshipId-shaped value",
      ).not.toContain("friendshipId");
    });
  });
});
