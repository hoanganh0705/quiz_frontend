import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LanguageSettings,
  formatDateWithPattern,
} from "../LanguageSettings";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";

type LocaleSettings = {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
};

function makeProfile(locale?: Partial<LocaleSettings>): UserMeResponseDto {
  const defaults: LocaleSettings = {
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  };
  const merged = locale ? { ...defaults, ...locale } : defaults;
  return {
    userId: "user-1",
    username: "johndoe",
    email: "john@example.com",
    displayName: "John Doe",
    avatarUrl: null,
    bio: null,
    xpTotal: 0,
    currentStreak: 0,
    longestStreak: 0,
    settings: { locale: merged },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const mockState = {
  mutate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  lastError: null,
  lastApiError: null,
  resetError: vi.fn(),
};

vi.mock("@/features/users/hooks/useUpdateMySettings", () => ({
  useUpdateMySettings: vi.fn().mockImplementation(() => mockState),
}));

vi.mock("@/shared/hooks/use-app-language", () => ({
  useAppLanguage: vi.fn().mockImplementation(() => ({
    setLanguage: vi.fn(),
    language: "en",
    t: (_key: string, fallback: string) => fallback,
  })),
}));

describe("LanguageSettings", () => {
  beforeEach(() => {
    mockState.isPending = false;
    mockState.isSuccess = false;
    mockState.isError = false;
    mockState.lastError = null;
    mockState.mutate.mockClear();
  });

  it("renders skeletons while profile is null", () => {
    const { container } = render(<LanguageSettings profile={null} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders the Language & Region h2 header", () => {
    render(<LanguageSettings profile={makeProfile()} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Language & Region/i }),
    ).toBeInTheDocument();
  });

  it("associates labels with all three select triggers", () => {
    render(<LanguageSettings profile={makeProfile()} />);
    expect(screen.getByLabelText(/Display Language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Timezone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Format/i)).toBeInTheDocument();
  });

  it("formats preview dates according to selected date format pattern", () => {
    const sampleDate = new Date("2026-08-09T13:30:00Z");
    expect(formatDateWithPattern(sampleDate, "MM/DD/YYYY", "UTC")).toBe(
      "08/09/2026",
    );
    expect(formatDateWithPattern(sampleDate, "DD/MM/YYYY", "UTC")).toBe(
      "09/08/2026",
    );
    expect(formatDateWithPattern(sampleDate, "YYYY-MM-DD", "UTC")).toBe(
      "2026-08-09",
    );
    expect(formatDateWithPattern(sampleDate, "DD MMM YYYY", "UTC")).toBe(
      "09 Aug 2026",
    );
    expect(formatDateWithPattern(sampleDate, "MMM DD, YYYY", "UTC")).toBe(
      "Aug 09, 2026",
    );
  });

  it("renders 12-hour and 24-hour time format radio buttons", () => {
    render(<LanguageSettings profile={makeProfile()} />);
    expect(screen.getByRole("radio", { name: /12-hour/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /24-hour/i })).toBeInTheDocument();
  });

  it("disables selects while pending", () => {
    mockState.isPending = true;
    const { rerender } = render(<LanguageSettings profile={makeProfile()} />);
    rerender(<LanguageSettings profile={makeProfile()} />);
    const selects = screen.getAllByRole("combobox");
    for (const sel of selects) {
      expect(sel).toBeDisabled();
    }
  });
});
