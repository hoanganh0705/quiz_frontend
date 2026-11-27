import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getTags } from "@/lib/api";

import {
  getTagBySlug,
  getTagsBySlugs,
} from "@/features/tags/services/tags.service";

import type { TagResponseDto } from "@/lib/api/generated/schemas";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getTags: vi.fn(),
  };
});

const SAMPLE_TAG: TagResponseDto = {
  tagId: "0192f4d8-0000-7000-8000-000000000010",
  name: "Programming",
  slug: "programming",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("tags.service — getTagBySlug & getTagsBySlugs", () => {
  const tagControllerGetTagsBySlugs = vi.fn();
  const tagControllerGetTagById = vi.fn();
  const tagControllerGetTagBySlug = vi.fn();

  beforeEach(() => {
    vi.mocked(getTags).mockReturnValue({
      tagControllerGetTagsBySlugs,
      tagControllerGetTagById,
      tagControllerGetTagBySlug,
    } as unknown as ReturnType<typeof getTags>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves a slug via GET /api/v1/tags/by-slugs instead of shadowed GET /api/v1/tags/:slug", async () => {
    tagControllerGetTagsBySlugs.mockResolvedValue({
      data: [SAMPLE_TAG],
      meta: { timestamp: "2026-11-25T00:00:00.000Z" },
    });

    const result = await getTagBySlug("programming");

    expect(tagControllerGetTagsBySlugs).toHaveBeenCalledWith({
      slugs: "programming",
    });
    expect(tagControllerGetTagBySlug).not.toHaveBeenCalled();
    expect(tagControllerGetTagById).not.toHaveBeenCalled();
    expect(result.data).toEqual(SAMPLE_TAG);
  });

  it("normalizes whitespace and uppercase characters before querying by-slugs", async () => {
    tagControllerGetTagsBySlugs.mockResolvedValue({
      data: [SAMPLE_TAG],
      meta: { timestamp: "2026-11-25T00:00:00.000Z" },
    });

    const result = await getTagBySlug("  Programming  ");

    expect(tagControllerGetTagsBySlugs).toHaveBeenCalledWith({
      slugs: "programming",
    });
    expect(result.data).toEqual(SAMPLE_TAG);
  });

  it("throws a 404 TAG_NOT_FOUND ApiError when by-slugs returns an empty list", async () => {
    tagControllerGetTagsBySlugs.mockResolvedValue({
      data: [],
      meta: { timestamp: "2026-11-25T00:00:00.000Z" },
    });

    await expect(getTagBySlug("unknown-topic")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 404 &&
        err.code === "TAG_NOT_FOUND",
    );
  });

  it("throws a 404 TAG_NOT_FOUND ApiError immediately for malformed slugs without calling the API", async () => {
    await expect(getTagBySlug("invalid slug!")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 404 &&
        err.code === "TAG_NOT_FOUND",
    );

    expect(tagControllerGetTagsBySlugs).not.toHaveBeenCalled();
    expect(tagControllerGetTagById).not.toHaveBeenCalled();
  });

  it("dispatches UUID v7 identifiers to tagControllerGetTagById", async () => {
    tagControllerGetTagById.mockResolvedValue({
      data: SAMPLE_TAG,
      meta: { timestamp: "2026-11-25T00:00:00.000Z" },
    });

    const result = await getTagBySlug(SAMPLE_TAG.tagId);

    expect(tagControllerGetTagById).toHaveBeenCalledWith(SAMPLE_TAG.tagId);
    expect(tagControllerGetTagsBySlugs).not.toHaveBeenCalled();
    expect(result.data).toEqual(SAMPLE_TAG);
  });

  it("batches multiple slugs into a comma-separated query in getTagsBySlugs", async () => {
    tagControllerGetTagsBySlugs.mockResolvedValue({
      data: [SAMPLE_TAG],
      meta: { timestamp: "2026-11-25T00:00:00.000Z" },
    });

    await getTagsBySlugs(["Programming", " web-dev "]);

    expect(tagControllerGetTagsBySlugs).toHaveBeenCalledWith({
      slugs: "programming,web-dev",
    });
  });
});
