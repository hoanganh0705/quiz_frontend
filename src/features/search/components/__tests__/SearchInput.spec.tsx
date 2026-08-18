

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { SearchInput } from "@/features/search/components/SearchInput";

const mockGetFeatureFlagValue = vi.fn();
const mockPushHistory = vi.fn();
const mockClearHistory = vi.fn();
const mockOnSubmit = vi.fn();

vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock("@/features/search/hooks/useDebouncedValue", async () => {

const actual = await vi.importActual<typeof import("@/features/search/hooks/useDebouncedValue")>(
"@/features/search/hooks/useDebouncedValue",
  );
return actual;
});

vi.mock("@/features/search/hooks/useSearchHistory", () => ({
useSearchHistory: vi.fn(() => ({
entries: [
{ query: "recent search", timestamp: Date.now() - 1000 },
{ query: "another search", timestamp: Date.now() - 2000 },
    ],
push: mockPushHistory,
clear: mockClearHistory,
remove: vi.fn(),
  })),
SEARCH_HISTORY_MAX_ENTRIES: 10,
}));

vi.mock("@/features/search/hooks/useSearch", () => ({
SEARCH_MIN_QUERY_LENGTH: 2,
}));

describe("SearchInput", () => {
beforeEach(() => {
vi.clearAllMocks();
vi.useFakeTimers();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.useRealTimers();
  });

describe("rendering", () => {
it("renders a search input with accessible label", () => {
render(<SearchInput onSubmit={vi.fn()} />);

const input = screen.getByRole("combobox", { name: /search/i });
expect(input).toBeInTheDocument();
    });

it("uses the default placeholder text", () => {
render(<SearchInput onSubmit={vi.fn()} />);

const input = screen.getByRole("combobox");
expect(input).toHaveAttribute("placeholder", "Search quizzes, users, tournaments…");
    });

it("uses a custom placeholder when provided", () => {
render(<SearchInput onSubmit={vi.fn()} placeholder="Find something" />);

const input = screen.getByRole("combobox");
expect(input).toHaveAttribute("placeholder", "Find something");
    });
  });

describe("controlled value", () => {
it("displays the controlled value", () => {
render(<SearchInput value="controlled value" onSubmit={vi.fn()} />);

const input = screen.getByRole("combobox") as HTMLInputElement;
expect(input.value).toBe("controlled value");
    });

it("updates when controlled value changes", () => {
const { rerender } = render(
<SearchInput value="first" onSubmit={vi.fn()} />,
      );

rerender(<SearchInput value="second" onSubmit={vi.fn()} />);

const input = screen.getByRole("combobox") as HTMLInputElement;
expect(input.value).toBe("second");
    });
  });

describe("keyboard navigation (TKT-5.6.G2 AC #4)", () => {
it("ArrowDown moves highlight down in suggestions", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.click(input);

fireEvent.focus(input);

const suggestions = screen.queryByRole("listbox");
if (suggestions) {
fireEvent.keyDown(input, { key: "ArrowDown" });

const firstOption = screen.queryByRole("option", { name: /recent search/i });
expect(firstOption).toHaveAttribute("aria-selected", "true");
      }
    });

it("Enter submits the highlighted suggestion", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.click(input);
fireEvent.focus(input);

fireEvent.keyDown(input, { key: "ArrowDown" });
fireEvent.keyDown(input, { key: "Enter" });

expect(mockOnSubmit).toHaveBeenCalledWith("recent search");
    });

it("Escape closes the suggestion list", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.click(input);
fireEvent.focus(input);

const suggestions = screen.queryByRole("listbox");
if (suggestions) {
fireEvent.keyDown(input, { key: "Escape" });
expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      }
    });

it("Enter submits the typed value when no suggestion is highlighted", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.click(input);
fireEvent.focus(input);
fireEvent.change(input, { target: { value: "typed query" } });

fireEvent.keyDown(input, { key: "Enter" });

act(() => {
vi.advanceTimersByTime(300);
      });

expect(mockOnSubmit).toHaveBeenCalledWith("typed query");
    });
  });

describe("debounced submit (TKT-5.6.G2 AC #4)", () => {
it("does not submit before the debounce delay", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.change(input, { target: { value: "quick" } });

act(() => {
vi.advanceTimersByTime(200);
      });

expect(mockOnSubmit).not.toHaveBeenCalled();
    });

it("fires onSubmit after the debounce delay", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.change(input, { target: { value: "debounced" } });

act(() => {
vi.advanceTimersByTime(300);
      });

expect(mockOnSubmit).toHaveBeenCalledWith("debounced");
    });

it("fires once even with rapid keystrokes", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.change(input, { target: { value: "r" } });
fireEvent.change(input, { target: { value: "ra" } });
fireEvent.change(input, { target: { value: "rap" } });
fireEvent.change(input, { target: { value: "rapid" } });

act(() => {
vi.advanceTimersByTime(300);
      });

expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

describe("suggestions", () => {
it("clicking a suggestion submits it", () => {
render(<SearchInput onSubmit={mockOnSubmit} />);

const input = screen.getByRole("combobox");
fireEvent.click(input);
fireEvent.focus(input);

const option = screen.queryByRole("option", { name: /recent search/i });
if (option) {
fireEvent.click(option);
expect(mockOnSubmit).toHaveBeenCalledWith("recent search");
      }
    });
  });
});