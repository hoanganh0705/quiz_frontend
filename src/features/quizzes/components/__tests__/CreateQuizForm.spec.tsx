import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import {
  CreateQuizForm,
  CREATE_QUIZ_FORM_DEFAULT_VALUES,
  formatDurationSummary,
  type QuizCreateFormValues,
} from "../CreateQuizForm";

// Mock the network hooks used in CreateQuizForm
vi.mock("@/features/quizzes/hooks/useCreateQuiz", () => ({
  useCreateQuiz: () => ({
    submit: vi.fn(),
    isSubmitting: false,
    error: null,
    resetError: vi.fn(),
  }),
}));

vi.mock("@/features/quizzes/hooks/useTagSlugsToIds", () => ({
  useTagSlugsToIds: () => ({
    resolve: vi.fn().mockResolvedValue([]),
    error: null,
  }),
}));

function TestWrapper({
  defaultValues = CREATE_QUIZ_FORM_DEFAULT_VALUES,
}: {
  defaultValues?: Partial<QuizCreateFormValues>;
}) {
  const form = useForm<QuizCreateFormValues>({
    defaultValues: {
      ...CREATE_QUIZ_FORM_DEFAULT_VALUES,
      ...defaultValues,
      initialVersion: {
        ...CREATE_QUIZ_FORM_DEFAULT_VALUES.initialVersion,
        ...(defaultValues.initialVersion ?? {}),
      },
    },
  });

  return (
    <div>
      <CreateQuizForm form={form} />
      <div data-testid="form-duration-ms">
        {form.watch("initialVersion.durationMs")}
      </div>
      <div data-testid="form-acknowledgements">
        {String(form.watch("acknowledgements"))}
      </div>
    </div>
  );
}

describe("formatDurationSummary", () => {
  it("formats seconds correctly across tiers", () => {
    expect(formatDurationSummary(0)).toBe("0s");
    expect(formatDurationSummary(-5)).toBe("0s");
    expect(formatDurationSummary(45)).toBe("45s");
    expect(formatDurationSummary(60)).toBe("1 min (60s)");
    expect(formatDurationSummary(90)).toBe("1m 30s (90s)");
    expect(formatDurationSummary(180)).toBe("3 min (180s)");
    expect(formatDurationSummary(300)).toBe("5 min (300s)");
    expect(formatDurationSummary(600)).toBe("10 min (600s)");
    expect(formatDurationSummary(900)).toBe("15 min (900s)");
  });
});

describe("CreateQuizForm — Time Limit & Presets", () => {
  it("renders with duration in seconds (60s) by default with active 1m preset", () => {
    render(<TestWrapper />);

    const durationInput = screen.getByLabelText("Time Limit") as HTMLInputElement;
    expect(durationInput.value).toBe("60");
    expect(screen.getByText("1 min (60s)")).toBeInTheDocument();
    expect(screen.getByText("s")).toBeInTheDocument();
    expect(
      screen.getByText("Choose a quick preset or enter custom seconds (e.g. 60s = 1 min)."),
    ).toBeInTheDocument();

    // Check 1m preset is selected (has brand background)
    const btn1m = screen.getByRole("button", { name: "1m" });
    expect(btn1m).toHaveClass("bg-brand");

    const btn3m = screen.getByRole("button", { name: "3m" });
    expect(btn3m).not.toHaveClass("bg-brand");
  });

  it("updates duration input and form state when clicking a preset", () => {
    render(<TestWrapper />);

    const durationInput = screen.getByLabelText("Time Limit") as HTMLInputElement;
    const btn3m = screen.getByRole("button", { name: "3m" });
    const btn1m = screen.getByRole("button", { name: "1m" });

    // Click 3m preset
    fireEvent.click(btn3m);

    expect(durationInput.value).toBe("180");
    expect(screen.getByText("3 min (180s)")).toBeInTheDocument();
    expect(btn3m).toHaveClass("bg-brand");
    expect(btn1m).not.toHaveClass("bg-brand");
    expect(screen.getByTestId("form-duration-ms").textContent).toBe("180000");

    // Click 5m preset
    const btn5m = screen.getByRole("button", { name: "5m" });
    fireEvent.click(btn5m);

    expect(durationInput.value).toBe("300");
    expect(screen.getByText("5 min (300s)")).toBeInTheDocument();
    expect(btn5m).toHaveClass("bg-brand");
    expect(btn3m).not.toHaveClass("bg-brand");
    expect(screen.getByTestId("form-duration-ms").textContent).toBe("300000");

    // Click 10m preset
    const btn10m = screen.getByRole("button", { name: "10m" });
    fireEvent.click(btn10m);

    expect(durationInput.value).toBe("600");
    expect(screen.getByText("10 min (600s)")).toBeInTheDocument();
    expect(btn10m).toHaveClass("bg-brand");
    expect(screen.getByTestId("form-duration-ms").textContent).toBe("600000");

    // Click 15m preset
    const btn15m = screen.getByRole("button", { name: "15m" });
    fireEvent.click(btn15m);

    expect(durationInput.value).toBe("900");
    expect(screen.getByText("15 min (900s)")).toBeInTheDocument();
    expect(btn15m).toHaveClass("bg-brand");
    expect(screen.getByTestId("form-duration-ms").textContent).toBe("900000");
  });

  it("updates duration and form state when typing custom seconds", () => {
    render(<TestWrapper />);

    const durationInput = screen.getByLabelText("Time Limit") as HTMLInputElement;

    // Type 90 seconds
    fireEvent.change(durationInput, { target: { value: "90" } });

    expect(durationInput.value).toBe("90");
    expect(screen.getByText("1m 30s (90s)")).toBeInTheDocument();
    expect(screen.getByTestId("form-duration-ms").textContent).toBe("90000");

    // Non-matching preset: all preset buttons are unselected
    const btn1m = screen.getByRole("button", { name: "1m" });
    const btn3m = screen.getByRole("button", { name: "3m" });
    expect(btn1m).not.toHaveClass("bg-brand");
    expect(btn3m).not.toHaveClass("bg-brand");

    // Typing a preset equivalent (e.g. 180s) selects that preset
    fireEvent.change(durationInput, { target: { value: "180" } });
    expect(screen.getByRole("button", { name: "3m" })).toHaveClass("bg-brand");
  });

  it("updates acknowledgements checkbox reactively", () => {
    render(<TestWrapper />);

    const checkbox = screen.getByRole("checkbox", {
      name: "I confirm these settings are correct",
    });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByTestId("form-acknowledgements").textContent).toBe("false");

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByTestId("form-acknowledgements").textContent).toBe("true");
  });

  it("enables submit CTA for restored drafts with title even when isDirty is false", () => {
    // When a draft is restored, defaultValues contains title and values, but isDirty is false
    render(<TestWrapper defaultValues={{ title: "Restored Draft Title" }} />);

    const submitBtn = screen.getByRole("button", { name: "Create quiz draft" });
    expect(submitBtn).toBeEnabled();
    expect(submitBtn).toHaveAttribute("type", "submit");
  });

  it("associates the slug label with the slug input via htmlFor", () => {
    render(<TestWrapper />);

    const slugInput = screen.getByPlaceholderText("my-quiz-slug");
    expect(slugInput.id).toBe("slug-slug");

    const slugLabel = screen.getByText("URL Slug");
    expect(slugLabel).toHaveAttribute("for", "slug-slug");
  });
});
