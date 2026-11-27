import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PrivacyRoute, {
  metadata as privacyMetadata,
} from "@/app/(public)/privacy/page";
import TermsRoute, {
  metadata as termsMetadata,
} from "@/app/(public)/terms/page";

import {
  PRIVACY_POLICY_DOCUMENT,
  TERMS_OF_SERVICE_DOCUMENT,
} from "@/features/legal";

import { LEGAL_ROUTES, PUBLIC_SITEMAP_ROUTES } from "@/shared/config/routes";

afterEach(() => {
  cleanup();
});

describe("Legal pages — /terms & /privacy", () => {
  it("registers /terms and /privacy in LEGAL_ROUTES and PUBLIC_SITEMAP_ROUTES", () => {
    expect(LEGAL_ROUTES.terms).toBe("/terms");
    expect(LEGAL_ROUTES.privacy).toBe("/privacy");
    expect(PUBLIC_SITEMAP_ROUTES).toContain("/terms");
    expect(PUBLIC_SITEMAP_ROUTES).toContain("/privacy");
  });

  it("renders Terms of Service with h1, matching TOC anchors, and cross-links", () => {
    render(<TermsRoute />);

    expect(screen.getByTestId("legal-page-terms")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();

    const toc = screen.getByRole("navigation", { name: "Table of contents" });
    for (const section of TERMS_OF_SERVICE_DOCUMENT.sections) {
      const link = toc.querySelector(`a[href="#${section.id}"]`);
      expect(link).not.toBeNull();
      expect(document.getElementById(section.id)).not.toBeNull();
    }

    expect(
      screen.getByRole("link", { name: /Privacy Policy/i }),
    ).toHaveAttribute("href", LEGAL_ROUTES.privacy);
    expect(
      screen.getByRole("link", { name: /Support Center/i }),
    ).toHaveAttribute("href", "/support");
    expect(termsMetadata.title).toContain("Terms of Service");
  });

  it("renders Privacy Policy with h1, matching TOC anchors, and cross-links", () => {
    render(<PrivacyRoute />);

    expect(screen.getByTestId("legal-page-privacy")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();

    const toc = screen.getByRole("navigation", { name: "Table of contents" });
    for (const section of PRIVACY_POLICY_DOCUMENT.sections) {
      const link = toc.querySelector(`a[href="#${section.id}"]`);
      expect(link).not.toBeNull();
      expect(document.getElementById(section.id)).not.toBeNull();
    }

    expect(
      screen.getByRole("link", { name: /Terms of Service/i }),
    ).toHaveAttribute("href", LEGAL_ROUTES.terms);
    expect(
      screen.getByRole("link", { name: /Support Center/i }),
    ).toHaveAttribute("href", "/support");
    expect(privacyMetadata.title).toContain("Privacy Policy");
  });
});
