import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { useCreateTag } from "../useCreateTag";

const mockInvalidateQueries = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockCreateTag = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/features/admin/services/tag-admin.service", () => ({
  createTag: mockCreateTag,
}));

vi.mock("@/features/admin/tag-admin/cache/tag-cross-tab", () => ({
  broadcastTagAdminInvalidate: mockBroadcastTagAdminInvalidate,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockInvalidateQueries.mockClear();
  mockBroadcastTagAdminInvalidate.mockClear();
});

describe("useCreateTag", () => {
  it("create() returns the new tag and clears isPending on success", async () => {
    const newTag = {
      tagId: "tag-new",
      name: "Rust",
      slug: "rust",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    mockCreateTag.mockResolvedValue(newTag);

    const { result } = renderHook(() => useCreateTag());

    await expect(
      result.current.create({ name: "Rust" }),
    ).resolves.toMatchObject({ tagId: "tag-new" });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("propagates TAG_SLUG_CONFLICT as ApiError", async () => {
    mockCreateTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            extensions: { code: "TAG_SLUG_CONFLICT" },
          },
        },
      } as never),
    );

    const { result } = renderHook(() => useCreateTag());

    await expect(
      result.current.create({ name: "Rust", slug: "taken" }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("reset() clears the error", async () => {
    mockCreateTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 500,
          data: { extensions: { code: "GLOBAL_INTERNAL_ERROR" } },
        },
      } as never),
    );

    const { result } = renderHook(() => useCreateTag());

    await expect(result.current.create({ name: "Rust" })).rejects.toBeDefined();

    result.current.reset();
    expect(result.current.error).toBeNull();
  });

  it("invalidates admin and public caches on success", async () => {
    mockCreateTag.mockResolvedValue({
      tagId: "tag-1",
      name: "Rust",
      slug: "rust",
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useCreateTag());

    await result.current.create({ name: "Rust" });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tag-admin:list"],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tags:directory"],
    });
  });

  it("broadcasts tag admin invalidation on success", async () => {
    mockCreateTag.mockResolvedValue({
      tagId: "tag-1",
      name: "Rust",
      slug: "rust",
      createdAt: "",
      updatedAt: "",
    });

    const { result } = renderHook(() => useCreateTag());

    await result.current.create({ name: "Rust" });

    expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith(
      "create",
      "tag-1",
    );
  });

  it("does not broadcast on failure", async () => {
    mockCreateTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: "TAG_SLUG_CONFLICT" } },
        },
      } as never),
    );

    const { result } = renderHook(() => useCreateTag());

    await expect(
      result.current.create({ name: "Rust" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });
});
