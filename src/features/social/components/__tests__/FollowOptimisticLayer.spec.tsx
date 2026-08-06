/**
 * `FollowOptimisticLayer.spec.tsx` — locks the FollowOptimisticLayer contract
 * (TKT-6.6.E5).
 *
 * Coverage:
 *   - variant === 'following' → "Following..." label
 *   - variant === 'unfollowing' → "Unfollowing..." label
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FollowOptimisticLayer } from "@/features/social/components/FollowOptimisticLayer";

describe("FollowOptimisticLayer — TKT-6.6.E5", () => {
  it("renders 'Following...' for variant 'following'", () => {
    render(<FollowOptimisticLayer variant="following" />);
    expect(screen.getByText("Following...")).toBeInTheDocument();
  });

  it("renders 'Unfollowing...' for variant 'unfollowing'", () => {
    render(<FollowOptimisticLayer variant="unfollowing" />);
    expect(screen.getByText("Unfollowing...")).toBeInTheDocument();
  });
});
