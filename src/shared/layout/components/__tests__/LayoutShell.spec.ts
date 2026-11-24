import { describe, it, expect } from "vitest";
import {
  isShellPage,
  isAuthPage,
  SHELL_PREFIXES,
} from "../../constants/shell-routes";

describe("LayoutShell route matching", () => {
  it("includes /instances in SHELL_PREFIXES", () => {
    expect(SHELL_PREFIXES).toContain("/instances");
  });

  it("identifies /instances and subroutes as shell pages", () => {
    expect(isShellPage("/instances")).toBe(true);
    expect(isShellPage("/instances/room-123")).toBe(true);
    expect(isShellPage("/instances/room-123/play")).toBe(true);
  });

  it("identifies root and other shell routes properly", () => {
    expect(isShellPage("/")).toBe(true);
    expect(isShellPage("/quizzes")).toBe(true);
    expect(isShellPage("/tournaments")).toBe(true);
    expect(isShellPage("/users/01a1fb95-1c96-7972-9586-a4a38421e241")).toBe(true);
    expect(isShellPage(undefined)).toBe(true);
  });

  it("does not treat unlisted or admin routes as main shell pages", () => {
    expect(isShellPage("/admin")).toBe(false);
    expect(isShellPage("/admin/users")).toBe(false);
  });

  it("identifies auth pages properly", () => {
    expect(isAuthPage("/login")).toBe(true);
    expect(isAuthPage("/signup")).toBe(true);
    expect(isAuthPage("/instances")).toBe(false);
  });
});
