

import { describe, expect, it, vi, beforeEach } from "vitest";

import {
EPIC_6_5_BREADCRUMB_CATEGORY,
SOCIAL_EPIC_6_5_VERSION,
addSocialDiscoveryBreadcrumb,
addSocialSearchBreadcrumb,
SOCIAL_6_5_ROUTES,
type SocialDiscoveryKind,
type SocialSearchSurface,
} from "@/lib/social/social-discovery-sentry";

const mockAddBreadcrumb = vi.fn();
vi.mock("@sentry/nextjs", () => ({
__esModule: true,
default: {
addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
  },
addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

beforeEach(() => {
vi.clearAllMocks();
});

describe("Constants", () => {
it("EPIC_6_5_BREADCRUMB_CATEGORY is 'social'", () => {
expect(EPIC_6_5_BREADCRUMB_CATEGORY).toBe("social:6.5");
  });

it("SOCIAL_EPIC_6_5_VERSION is '1.0.0'", () => {
expect(SOCIAL_EPIC_6_5_VERSION).toBe("1.0.0");
  });
});

describe("SOCIAL_6_5_ROUTES", () => {
it("contains all expected route names", () => {
expect(SOCIAL_6_5_ROUTES.getSuggestions).toBe("social.getSuggestions");
expect(SOCIAL_6_5_ROUTES.getTrendingUsers).toBe("social.getTrendingUsers");
expect(SOCIAL_6_5_ROUTES.getSearchSuggestions).toBe("social.getSearchSuggestions");
expect(SOCIAL_6_5_ROUTES.searchUsers).toBe("social.searchUsers");
  });
});

describe("addSocialDiscoveryBreadcrumb", () => {
it("emits breadcrumb with correct category", () => {
addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSuggestions,
kind: "suggestions",
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.category).toBe("social:6.5");
  });

it("emits breadcrumb with epic version", () => {
addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSuggestions,
kind: "suggestions",
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.epic).toBe("1.0.0");
  });

it("emits breadcrumb with required fields only", () => {
addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSuggestions,
kind: "suggestions",
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.route).toBe("social.getSuggestions");
expect(breadcrumb.data.kind).toBe("suggestions");
expect(breadcrumb.data).not.toHaveProperty("normalizedQueryLength");
expect(breadcrumb.data).not.toHaveProperty("offset");
expect(breadcrumb.data).not.toHaveProperty("total");
  });

it("emits breadcrumb with all optional fields", () => {
addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSearchSuggestions,
kind: "search-suggestions",
normalizedQueryLength: 5,
offset: 0,
limit: 20,
total: 15,
status: 200,
durationMs: 45,
code: "SUCCESS",
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.normalizedQueryLength).toBe(5);
expect(breadcrumb.data.offset).toBe(0);
expect(breadcrumb.data.limit).toBe(20);
expect(breadcrumb.data.total).toBe(15);
expect(breadcrumb.data.status).toBe(200);
expect(breadcrumb.data.durationMs).toBe(45);
expect(breadcrumb.data.code).toBe("SUCCESS");
  });

it("accepts surface field for suggestions and trending", () => {
addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSuggestions,
kind: "suggestions",
surface: "suggestions-page",
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.surface).toBe("suggestions-page");
  });

it("does NOT accept raw query string (signature test)", () => {

addSocialDiscoveryBreadcrumb({
route: SOCIAL_6_5_ROUTES.getSuggestions,
kind: "suggestions",
normalizedQueryLength: 10, // NOT the query string itself
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;

expect(typeof breadcrumb.data.normalizedQueryLength).toBe("number");

expect(breadcrumb.data).not.toHaveProperty("query");
expect(breadcrumb.data).not.toHaveProperty("rawQuery");
  });
});

describe("addSocialSearchBreadcrumb", () => {
it("emits breadcrumb with correct category", () => {
addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "social-search-page",
normalizedQueryLength: 5,
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.category).toBe("social:6.5");
  });

it("emits breadcrumb with epic version", () => {
addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "social-search-page",
normalizedQueryLength: 5,
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.epic).toBe("1.0.0");
  });

it("emits breadcrumb with required fields only", () => {
addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "global-search-bar",
normalizedQueryLength: 3,
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.route).toBe("social.searchUsers");
expect(breadcrumb.data.surface).toBe("global-search-bar");
expect(breadcrumb.data.normalizedQueryLength).toBe(3);
expect(breadcrumb.data).not.toHaveProperty("cooldownSeconds");
expect(breadcrumb.data).not.toHaveProperty("reason");
  });

it("emits breadcrumb with all optional fields", () => {
addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "social-search-page",
normalizedQueryLength: 5,
offset: 0,
limit: 20,
total: 12,
cooldownSeconds: 30,
status: 200,
durationMs: 67,
code: "SUCCESS",
reason: "success",
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb.data.offset).toBe(0);
expect(breadcrumb.data.limit).toBe(20);
expect(breadcrumb.data.total).toBe(12);
expect(breadcrumb.data.cooldownSeconds).toBe(30);
expect(breadcrumb.data.status).toBe(200);
expect(breadcrumb.data.durationMs).toBe(67);
expect(breadcrumb.data.code).toBe("SUCCESS");
expect(breadcrumb.data.reason).toBe("success");
  });

it("accepts both surface values", () => {
addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "global-search-bar",
normalizedQueryLength: 3,
    });

const [breadcrumb1] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb1.data.surface).toBe("global-search-bar");

vi.clearAllMocks();

addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "social-search-page",
normalizedQueryLength: 5,
    });

const [breadcrumb2] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;
expect(breadcrumb2.data.surface).toBe("social-search-page");
  });

it("does NOT accept raw query string (signature test)", () => {

addSocialSearchBreadcrumb({
route: SOCIAL_6_5_ROUTES.searchUsers,
surface: "social-search-page",
normalizedQueryLength: 10, // NOT the query string itself
    });

const [breadcrumb] = mockAddBreadcrumb.mock.calls[0] as Parameters<
typeof mockAddBreadcrumb
    >;

expect(typeof breadcrumb.data.normalizedQueryLength).toBe("number");

expect(breadcrumb.data).not.toHaveProperty("query");
expect(breadcrumb.data).not.toHaveProperty("rawQuery");
  });
});
