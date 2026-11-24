import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

import { HostLiveRoomCta } from "@/features/instances/components/HostLiveRoomCta";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuthSession = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

const mockCreate = vi.fn();
const mockUseCreateInstance = vi.fn();
vi.mock("@/features/instances/hooks/useCreateInstance", () => ({
  useCreateInstance: () => mockUseCreateInstance(),
}));

describe("HostLiveRoomCta", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCreate.mockReset();
    mockUseAuthSession.mockReturnValue({
      bootstrapState: "authenticated",
      currentUser: { userId: "user-1" },
    });
    mockUseCreateInstance.mockReturnValue({
      create: mockCreate,
      isCreating: false,
      error: null,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.skip("returns null when flag is placeholder", () => {

    const { container } = render(<HostLiveRoomCta quizId="quiz-123" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders sign-in button when unauthenticated", () => {
    mockUseAuthSession.mockReturnValue({
      bootstrapState: "anonymous",
      currentUser: null,
    });

    render(<HostLiveRoomCta quizId="quiz-123" idOrSlug="slug-123" />);

    const link = screen.getByTestId("quiz-signin-to-host");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain("/login?returnUrl=");
  });

  it("renders host button and triggers creation on click", async () => {
    mockCreate.mockResolvedValueOnce({ instanceId: "inst-999" });

    render(<HostLiveRoomCta quizId="quiz-123" />);

    const button = screen.getByTestId("quiz-host-live-battle-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Host Live Battle");

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ quizId: "quiz-123" });
      expect(mockPush).toHaveBeenCalledWith("/instances/inst-999");
    });
  });

  it("renders creating state when isCreating is true", () => {
    mockUseCreateInstance.mockReturnValue({
      create: mockCreate,
      isCreating: true,
      error: null,
      reset: vi.fn(),
    });

    render(<HostLiveRoomCta quizId="quiz-123" />);

    const button = screen.getByTestId("quiz-host-live-battle-button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Creating Room…");
  });
});
