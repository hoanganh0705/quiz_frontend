/**
 * `MutualPreviewSkeleton.spec.tsx` — Locks the preview skeleton
 * shape (TKT-6.4.B3).
 *
 * Asserts:
 *
 *   - Renders the documented `data-testid` and `aria-busy`.
 *   - Renders `MUTUAL_PREVIEW_CAP` avatar placeholders by default.
 *   - Honors an explicit `avatarCount` override.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MutualPreviewSkeleton } from "@/features/social/components/MutualPreviewSkeleton";
import { MUTUAL_PREVIEW_CAP } from "@/features/social/mutual-count-invariants";

describe("MutualPreviewSkeleton", () => {
  it("renders the documented data-testid and aria-busy", () => {
    render(<MutualPreviewSkeleton />);
    const skeleton = screen.getByTestId("mutual-preview-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
  });

  it("renders MUTUAL_PREVIEW_CAP avatar placeholders by default", () => {
    render(<MutualPreviewSkeleton />);
    const skeleton = screen.getByTestId("mutual-preview-skeleton");
    expect(skeleton.getAttribute("data-avatar-count")).toBe(
      String(MUTUAL_PREVIEW_CAP),
    );
  });

  it("honors an explicit avatarCount override", () => {
    render(<MutualPreviewSkeleton avatarCount={3} />);
    const skeleton = screen.getByTestId("mutual-preview-skeleton");
    expect(skeleton.getAttribute("data-avatar-count")).toBe("3");
  });
});
