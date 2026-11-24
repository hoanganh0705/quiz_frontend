import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as React from "react";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock("@apollo/client/react", async () => {
  const actual = await vi.importActual<typeof import("@apollo/client/react")>(
    "@apollo/client/react",
  );
  return {
    ...actual,
    useQuery: useQueryMock,
  };
});

vi.mock("@/lib/graphql", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/graphql")>("@/lib/graphql");
  const Stub = ({ children }: { children: ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Stub.displayName = "ApolloSubtreeProviderStub";
  return {
    ...actual,
    ApolloSubtreeProvider: Stub,
  };
});

async function loadPage() {
  const mod = await import("./page");
  return mod.default;
}

beforeEach(() => {
  useQueryMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("__graphql-pilot sandbox route", () => {
  it("renders the loading branch while useQuery is still fetching", async () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    const Page = await loadPage();
    render(<Page />);

    expect(screen.getByTestId("graphql-pilot-sandbox")).toBeInTheDocument();
    expect(screen.getByTestId("graphql-pilot-loading")).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenCalledTimes(1);
  });

  it("renders the resolved `__typename` once the query returns", async () => {
    useQueryMock.mockReturnValue({
      data: { __typename: "Query" },
      loading: false,
      error: undefined,
    });

    const Page = await loadPage();
    render(<Page />);

    expect(screen.getByTestId("graphql-pilot-result")).toBeInTheDocument();
    expect(screen.getByTestId("graphql-pilot-result").textContent).toContain(
      "Query",
    );
    expect(screen.queryByTestId("graphql-pilot-error")).toBeNull();
  });

  it("renders the error branch when useQuery surfaces an Error", async () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("boom"),
    });

    const Page = await loadPage();
    render(<Page />);

    const errorNode = screen.getByTestId("graphql-pilot-error");
    expect(errorNode).toBeInTheDocument();
    expect(errorNode.textContent).toContain("boom");
  });

  it("renders the error branch when useQuery surfaces a non-Error rejection", async () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      loading: false,
      error: "string-failure",
    });

    const Page = await loadPage();
    render(<Page />);

    const errorNode = screen.getByTestId("graphql-pilot-error");
    expect(errorNode).toBeInTheDocument();
    expect(errorNode.textContent).toContain("string-failure");
  });

  it('falls back to "unknown" when useQuery resolves with no data', async () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    });

    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByTestId("graphql-pilot-result")).toBeInTheDocument();
    });
    expect(screen.getByTestId("graphql-pilot-result").textContent).toContain(
      "unknown",
    );
  });
});
