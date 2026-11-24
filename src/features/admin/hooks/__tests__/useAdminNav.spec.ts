// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ADMIN_PERMISSIONS } from "@/features/admin/permissions";

import { useAdminNav } from "../useAdminNav";

import type { AdminPermission } from "@/features/admin/permissions";

const mockUseAdminRole = vi.fn();

vi.mock("../useAdminRole", () => ({
  useAdminRole: () => mockUseAdminRole(),
}));

describe("useAdminNav", () => {
  it("returns loading state while admin role is loading", () => {
    mockUseAdminRole.mockReturnValue({
      isLoading: true,
      error: null,
      role: null,
      permissions: [],
    });

    const { result } = renderHook(() => useAdminNav());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.mainEntries.map((e) => e.label)).toEqual([
      "Dashboard",
      "Quizzes",
    ]);
    expect(result.current.bottomEntries.map((e) => e.label)).toEqual([
      "Settings",
    ]);
  });

  it("returns all 10 main entries and 2 bottom entries for full admin role", () => {
    mockUseAdminRole.mockReturnValue({
      isLoading: false,
      error: null,
      role: "admin",
      permissions: ADMIN_PERMISSIONS,
    });

    const { result } = renderHook(() => useAdminNav());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.mainEntries.map((e) => e.label)).toEqual([
      "Dashboard",
      "Quizzes",
      "Tournaments",
      "Categories",
      "Tags",
      "Users",
      "Audit log",
      "Rankings",
      "Comment Reports",
      "Review Reports",
    ]);

    expect(result.current.bottomEntries.map((e) => e.label)).toEqual([
      "Settings",
      "Roles & Permissions",
    ]);
  });

  it("filters out restricted entries when user has only moderation permissions", () => {
    const moderatorPermissions: AdminPermission[] = [
      "comment_report_read",
      "review_report_read",
    ];

    mockUseAdminRole.mockReturnValue({
      isLoading: false,
      error: null,
      role: "moderator",
      permissions: moderatorPermissions,
    });

    const { result } = renderHook(() => useAdminNav());

    const labels = result.current.mainEntries.map((e) => e.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Quizzes");
    expect(labels).toContain("Comment Reports");
    expect(labels).toContain("Review Reports");
    expect(labels).not.toContain("Tournaments");
    expect(labels).not.toContain("Users");
    expect(labels).not.toContain("Categories");
  });

  it("returns only permissionless entries when user has no permissions", () => {
    mockUseAdminRole.mockReturnValue({
      isLoading: false,
      error: null,
      role: null,
      permissions: [],
    });

    const { result } = renderHook(() => useAdminNav());

    expect(result.current.mainEntries.map((e) => e.label)).toEqual([
      "Dashboard",
      "Quizzes",
    ]);
    expect(result.current.bottomEntries.map((e) => e.label)).toEqual([
      "Settings",
    ]);
  });
});
