import * as React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import InstancesRoute, { metadata } from "@/app/(protected)/instances/page";

vi.mock("@/features/instances/pages/InstancesPage", () => ({
  InstancesPage: () => <div data-testid="instances-page-stub" />,
}));


describe("/instances route", () => {
  it("exports SEO metadata", () => {
    expect(metadata.title).toBe("Live Battles | QuizHub");
  });

  it("renders the InstancesPage component inside main", () => {
    render(<InstancesRoute />);
    expect(screen.getByTestId("instances-page-stub")).toBeInTheDocument();
  });
});
