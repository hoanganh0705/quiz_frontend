

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityRateLimitNotice } from "@/features/social/components/ActivityRateLimitNotice";

describe("ActivityRateLimitNotice", () => {
beforeEach(() => {
vi.useFakeTimers();
  });

afterEach(() => {
vi.useRealTimers();
  });

it("renders the documented copy with the seconds-remaining value", () => {
render(<ActivityRateLimitNotice cooldownSeconds={30} />);
const notice = screen.getByTestId("activity-rate-limit-notice");
expect(notice).toBeInTheDocument();
expect(notice.textContent).toContain("Activity is temporarily rate-limited");
expect(notice.textContent).toContain("30 seconds");
expect(notice.getAttribute("data-seconds-remaining")).toBe("30");
  });

it("decrements the countdown once per second", async () => {
render(<ActivityRateLimitNotice cooldownSeconds={3} />);
await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });
expect(
screen.getByTestId("activity-rate-limit-notice").getAttribute(
"data-seconds-remaining",
      ),
    ).toBe("2");
await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });
expect(
screen.getByTestId("activity-rate-limit-notice").getAttribute(
"data-seconds-remaining",
      ),
    ).toBe("1");
  });

it("calls onCooldownComplete when the cooldown reaches 0", async () => {
const onComplete = vi.fn();
render(<ActivityRateLimitNotice cooldownSeconds={2} onCooldownComplete={onComplete} />);

await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });

await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });
expect(onComplete).toHaveBeenCalledTimes(1);
  });

it("renders the 'try again now' copy after the cooldown completes", async () => {
render(<ActivityRateLimitNotice cooldownSeconds={1} />);
await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });
const notice = screen.getByTestId("activity-rate-limit-notice");
expect(notice.textContent).toContain("You can try again now");
expect(notice.getAttribute("data-cooldown-complete")).toBe("true");
  });

it("clamps a negative cooldownSeconds to 0", () => {
render(<ActivityRateLimitNotice cooldownSeconds={-5} />);
const notice = screen.getByTestId("activity-rate-limit-notice");
expect(notice.getAttribute("data-seconds-remaining")).toBe("0");
expect(notice.textContent).toContain("You can try again now");
  });

it("does not call onCooldownComplete when omitted", async () => {
render(<ActivityRateLimitNotice cooldownSeconds={1} />);

await act(async () => {
await vi.advanceTimersByTimeAsync(1_000);
    });
expect(
screen.getByTestId("activity-rate-limit-notice").getAttribute(
"data-seconds-remaining",
      ),
    ).toBe("0");
  });
});
