import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/Sidebar";
import { AdminNav } from "../AdminNav";

vi.mock("@/features/admin/hooks/useAdminNav", () => ({
  useAdminNav: vi.fn(),
}));

import { useAdminNav } from "@/features/admin/hooks/useAdminNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn<() => string>(),
}));

import { usePathname } from "next/navigation";

function setNav(
  mainEntries: Array<{
    href: string;
    label: string;
    requiredPermissions: string[];
  }>,
  bottomEntries: Array<{
    href: string;
    label: string;
    requiredPermissions: string[];
  }>,
  isLoading = false,
) {
  vi.mocked(useAdminNav).mockReturnValue({
    isLoading,
    mainEntries: mainEntries as never,
    bottomEntries: bottomEntries as never,
  });
}

function mockPathname(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
}

function renderNav() {
  return render(
    <SidebarProvider>
      <AdminNav />
    </SidebarProvider>,
  );
}

describe("AdminNav", () => {
  it("renders Dashboard nav item when in main entries", () => {
    setNav(
      [{ href: "/admin", label: "Dashboard", requiredPermissions: [] }],
      [],
    );
    mockPathname("/admin");
    renderNav();
    expect(screen.getByTestId("admin-nav-item--admin")).toBeInTheDocument();
  });

  it("renders Tags nav item when permitted", () => {
    setNav(
      [
        { href: "/admin", label: "Dashboard", requiredPermissions: [] },
        {
          href: "/admin/tags",
          label: "Tags",
          requiredPermissions: ["tag_create"],
        },
      ],
      [],
    );
    mockPathname("/admin");
    renderNav();
    expect(
      screen.getByTestId("admin-nav-item--admin-tags"),
    ).toBeInTheDocument();
  });

  it("does not render Categories nav item when not permitted", () => {
    setNav(
      [{ href: "/admin", label: "Dashboard", requiredPermissions: [] }],
      [],
    );
    mockPathname("/admin");
    renderNav();
    expect(
      screen.queryByTestId("admin-nav-item--admin-categories"),
    ).not.toBeInTheDocument();
  });

  it("renders loading skeleton items when isLoading is true", () => {
    setNav([], [], true);
    mockPathname("/admin");
    renderNav();

    expect(screen.queryAllByText("Loading…").length).toBeGreaterThan(0);
  });

  it("renders Settings nav item in bottom entries", () => {
    setNav(
      [{ href: "/admin", label: "Dashboard", requiredPermissions: [] }],
      [{ href: "/admin/settings", label: "Settings", requiredPermissions: [] }],
    );
    mockPathname("/admin");
    renderNav();
    expect(
      screen.getByTestId("admin-nav-item--admin-settings"),
    ).toBeInTheDocument();
  });

  it("renders a link with correct href for each visible entry", () => {
    setNav(
      [
        { href: "/admin", label: "Dashboard", requiredPermissions: [] },
        {
          href: "/admin/tags",
          label: "Tags",
          requiredPermissions: ["tag_create"],
        },
      ],
      [],
    );
    mockPathname("/admin");
    renderNav();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/admin/tags");
  });

  it("correctly marks only the most specific path as active when paths share a prefix", () => {
    setNav(
      [
        { href: "/admin", label: "Dashboard", requiredPermissions: [] },
        { href: "/admin/users", label: "Users", requiredPermissions: [] },
      ],
      [
        {
          href: "/admin/users/roles",
          label: "Roles & Permissions",
          requiredPermissions: [],
        },
      ],
    );

    mockPathname("/admin/users/roles");
    renderNav();

    const usersLink = screen.getByRole("link", { name: /Users/i });
    const rolesLink = screen.getByRole("link", {
      name: /Roles & Permissions/i,
    });

    expect(rolesLink.closest("[data-active]")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(usersLink.closest("[data-active]")).toHaveAttribute(
      "data-active",
      "false",
    );
  });
});
