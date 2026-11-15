import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("@/features/instances", () => ({
  InstancesPage: () => <div data-testid="instances-page-stub" />,
}));

import InstancesRoute, { metadata } from "@/app/(protected)/instances/page";

describe("/instances route", () => {
  it("exports SEO metadata", () => {
    expect(metadata.title).toBe("Live Battles | QuizHub");
  });

  it("renders the InstancesPage component inside main", () => {
    render(<InstancesRoute />);
    expect(screen.getByTestId("instances-page-stub")).toBeInTheDocument();
  });
});
