import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSettings } from "../AccountSettings";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";

const mockProfile: UserMeResponseDto = {
  userId: "user-1",
  username: "johndoe",
  email: "john@example.com",
  displayName: "John Doe",
  avatarUrl: null,
  bio: null,
  xpTotal: 0,
  currentStreak: 0,
  longestStreak: 0,
  settings: {},
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockState = {
  mutate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  lastError: null,
  lastApiError: null,
  resetError: vi.fn(),
};

vi.mock("@/features/users/hooks/useUpdateMyProfile", () => ({
  useUpdateMyProfile: vi.fn().mockImplementation(() => mockState),
}));

describe("AccountSettings", () => {
  beforeEach(() => {
    mockState.isPending = false;
    mockState.isSuccess = false;
    mockState.isError = false;
    mockState.lastError = null;
    mockState.mutate.mockClear();
  });

  it("renders skeletons while profile is null", () => {
    const { container } = render(<AccountSettings profile={null} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders h2 section heading and form fields when profile is provided", () => {
    render(<AccountSettings profile={mockProfile} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Account Settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username.*read-only/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Email address.*read-only/i),
    ).toBeInTheDocument();
  });

  it("links to /settings/security instead of rendering a mock password modal", () => {
    render(<AccountSettings profile={mockProfile} />);
    const securityLink = screen.getByRole("link", {
      name: /Manage password and active sessions/i,
    });
    expect(securityLink).toHaveAttribute("href", "/settings/security");
  });

  it("disables save button when form is not dirty", () => {
    render(<AccountSettings profile={mockProfile} />);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  it("shows Discard button when displayName is edited and resets value on click", () => {
    render(<AccountSettings profile={mockProfile} />);
    const input = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    expect(screen.queryByRole("button", { name: /Discard/i })).toBeNull();

    fireEvent.change(input, { target: { value: "Jane Doe" } });
    expect(input.value).toBe("Jane Doe");

    const discardBtn = screen.getByRole("button", { name: /Discard/i });
    fireEvent.click(discardBtn);
    expect(input.value).toBe("John Doe");
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  it("disables save button while isPending", () => {
    mockState.isPending = true;
    const { rerender } = render(<AccountSettings profile={mockProfile} />);
    rerender(<AccountSettings profile={mockProfile} />);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });
});
