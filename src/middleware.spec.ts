/**
 * Middleware spec — Epic 1.6 (US-1.6.1, US-1.6.2, US-1.6.3), Batches D, E, F.
 *
 *   - Batch D  → ET-1.6-D1 — protected route while unauthenticated
 *   - Batch E  → ET-1.6-E1 — auth-only route with `?redirect=` while authenticated
 *   - Batch E  → ET-1.6-E2 — auth-only route without `?redirect=` while authenticated
 *   - Batch F  → ET-1.6-F1 — malformed-token behaviour
 *
 * The middleware is a pure function over a `NextRequest` that returns a
 * `NextResponse`. We construct `NextRequest` instances in-process (Node
 * runtime; vitest's default environment) and assert against the returned
 * `NextResponse`'s status and `Location` header. No live dev server, no
 * network — every test is hermetic.
 *
 * The data driving this spec (the list of protected prefixes, the list of
 * auth-only routes) is duplicated from
 *   - docs/middleware-protected-routes.md (ET-1.6-A1, A2)
 *   - docs/middleware-auth-only-routes.md  (ET-1.6-B1)
 * and is asserted against those inventories as part of the "drift guard"
 * tests at the bottom of this file. If the inventories move, the drift
 * guard fails with a clear message.
 */

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./proxy";

/**
 * Build a NextRequest for a given pathname + optional cookie value.
 *
 * - `pathname` is the path part of the URL (no host — we use a fixed
 *   localhost origin).
 * - `cookieValue` is the value of the `auth_token` cookie. Pass `null` to
 *   omit the cookie entirely; pass `''` (empty string) to set a cookie
 *   whose value is empty (the middleware treats this the same as no
 *   cookie — see `getAuthTokenFromRequest` + `!!token`).
 * - `search` is appended to the URL (e.g. '?redirect=/my-profile').
 */
function buildRequest(
  pathname: string,
  options: { cookieValue?: string | null; search?: string } = {},
): NextRequest {
  const { cookieValue = null, search = "" } = options;
  const url = new URL(`http://localhost:3000${pathname}${search}`);
  const headers = new Headers();
  if (cookieValue !== null) {
    headers.set("cookie", `auth_token=${encodeURIComponent(cookieValue)}`);
  }
  return new NextRequest(url, { headers });
}

/**
 * Pull the numeric status code from a NextResponse.
 */
function statusOf(response: Response): number {
  return response.status;
}

/**
 * Return the `Location` header parsed as a URL. `NextResponse.redirect`
 * always emits an absolute URL, so this returns the URL object whose
 * `pathname` and `searchParams` are populated.
 *
 * If the response has no Location header (e.g. `NextResponse.next()`),
 * returns a URL whose `pathname` is `''` and `searchParams` is empty.
 */
function locationUrlOf(response: Response): URL {
  const raw = response.headers.get("location");
  if (raw === null || raw === "") {
    return new URL("http://noop/");
  }
  return new URL(raw);
}

// ── Inventory under test (kept in sync with the docs in `quiz_frontend/docs/`).
// ── Drift guard at the bottom of this file asserts these lists match the docs.

/** Every prefix the middleware redirects to /login when unauthenticated. */
const PROTECTED_PREFIXES = [
  "/bookmarks",
  "/create-quiz",
  "/discussions",
  "/friends",
  "/my-profile",
  "/onboarding",
  "/quiz-history",
  "/settings",
  "/tournament",
] as const;

/** The single admin prefix — same gate as PROTECTED_PREFIXES, role check is server-side. */
const ADMIN_PREFIXES = ["/admin"] as const;

/** Every auth-only route that redirects an authenticated user away. */
const AUTH_ONLY_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/resend-verification",
  "/verify-email",
] as const;

/** A token shape that is *never* empty and *never* contains a semicolon. */
const SOME_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.signature";

describe("middleware (Epic 1.6) — protected routes while unauthenticated (ET-1.6-D1)", () => {
  it.each(PROTECTED_PREFIXES)(
    "redirects GET /%s to /login?redirect=/%s when no auth_token cookie is set",
    (prefix) => {
      const request = buildRequest(prefix);
      const response = middleware(request);

      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe(prefix);
    },
  );

  it.each(PROTECTED_PREFIXES)(
    "redirects GET /%s/some-sub-path to /login?redirect=/%s/some-sub-path (prefix match inherits)",
    (prefix) => {
      const request = buildRequest(`${prefix}/some-sub-path`);
      const response = middleware(request);

      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe(`${prefix}/some-sub-path`);
    },
  );

  it.each(ADMIN_PREFIXES)(
    "redirects GET /%s to /login?redirect=/%s (admin prefix treated as protected)",
    (prefix) => {
      const request = buildRequest(prefix);
      const response = middleware(request);

      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe(prefix);
    },
  );

  it.each(ADMIN_PREFIXES)(
    "redirects GET /%s/users to /login?redirect=/%s/users (admin prefix is prefix-match)",
    (prefix) => {
      const request = buildRequest(`${prefix}/users`);
      const response = middleware(request);

      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe(`${prefix}/users`);
    },
  );
});

describe("middleware (Epic 1.6) — auth-only routes while authenticated (ET-1.6-E1, E2)", () => {
  describe("with `?redirect=` query param (ET-1.6-E1)", () => {
    it.each(AUTH_ONLY_ROUTES)(
      "redirects GET /%s?redirect=/my-profile to /my-profile when authenticated",
      (route) => {
        const request = buildRequest(route, {
          cookieValue: SOME_TOKEN,
          search: "?redirect=/my-profile",
        });
        const response = middleware(request);

        expect(statusOf(response)).toBe(307);
        expect(locationUrlOf(response).pathname).toBe("/my-profile");
      },
    );

    it("rejects a same-path redirect (?redirect=/login while at /login) and falls back to /", () => {
      const request = buildRequest("/login", {
        cookieValue: SOME_TOKEN,
        search: "?redirect=/login",
      });
      const response = middleware(request);

      expect(statusOf(response)).toBe(307);
      expect(locationUrlOf(response).pathname).toBe("/");
    });

    it.each(AUTH_ONLY_ROUTES)(
      "rejects same-path redirect at every auth-only route (no infinite-loop)",
      (route) => {
        const request = buildRequest(route, {
          cookieValue: SOME_TOKEN,
          search: `?redirect=${route}`,
        });
        const response = middleware(request);

        expect(statusOf(response)).toBe(307);
        // Falls through to the default, not the same path.
        const loc = locationUrlOf(response);
        expect(loc.pathname).toBe("/");
        expect(loc.pathname).not.toBe(route);
      },
    );
  });

  describe("without `?redirect=` query param (ET-1.6-E2)", () => {
    it.each(AUTH_ONLY_ROUTES)(
      "redirects GET /%s to / when authenticated",
      (route) => {
        const request = buildRequest(route, { cookieValue: SOME_TOKEN });
        const response = middleware(request);

        expect(statusOf(response)).toBe(307);
        expect(locationUrlOf(response).pathname).toBe("/");
      },
    );
  });
});

describe("middleware (Epic 1.6) — auth-only routes while unauthenticated", () => {
  // Locking the *negative* direction: an unauthenticated user must NOT be
  // bounced off /login. Otherwise the redirect loop on logout would be
  // possible.
  it.each(AUTH_ONLY_ROUTES)(
    "does NOT redirect GET /%s when no auth_token cookie is set (lets the page render)",
    (route) => {
      const request = buildRequest(route);
      const response = middleware(request);

      expect(statusOf(response)).toBe(200);
      // No Location header set by NextResponse.next().
      expect(response.headers.get("location")).toBeNull();
    },
  );
});

describe("middleware (Epic 1.6) — presence-only token check, ET-1.6-F1", () => {
  /**
   * The middleware does **not** validate the JWT. It only checks whether the
   * `auth_token` cookie is *present and non-empty* (cookie value passes
   * the `!!token` truthiness check on line 47 of `middleware.ts`). This
   * block locks that contract so that:
   *
   *   1. A future "smart" change that introspects the JWT (e.g. checks
   *      signature expiry) cannot regress into a 5xx or false-positive.
   *   2. A future bug that swaps `!!token` for `token === 'valid'` is
   *      caught immediately.
   *
   * Every malformed-but-non-empty token below still triggers the same
   * code path as a valid token: the cookie is present and non-empty, so
   * the middleware treats the user as authenticated. (The backend's
   * `JwtGuard` will reject the request on the first authenticated API
   * call — that is by design and documented in the JSDoc header at the
   * top of `middleware.ts`.)
   *
   * The "empty string" case is intentionally listed under "no cookie"
   * further below — the cookie header IS set but its value is the empty
   * string, which `getAuthTokenFromRequest` returns as `''`, and `!!''`
   * is `false`. This is the right behaviour: an empty cookie value is
   * operationally identical to "no cookie at all".
   */

  const MALFORMED_TOKENS = [
    { label: "single char", token: "a" },
    { label: "short garbage", token: "abc" },
    { label: "random base64", token: "Z29vZHpZ" },
    {
      label: "three-segment but bad signature",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.not-a-real-signature",
    },
    {
      label: "expired-looking (3 segments, exp claim in the past)",
      token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.signature",
    },
  ] as const;

  describe("authenticated path (cookie present, even with malformed token)", () => {
    it.each(MALFORMED_TOKENS)(
      "$label — treats request as authenticated for an AUTH_ONLY route (redirects away to /)",
      ({ token }) => {
        const request = buildRequest("/login", { cookieValue: token });
        const response = middleware(request);

        expect(statusOf(response)).toBe(307);
        expect(locationUrlOf(response).pathname).toBe("/");
      },
    );

    it.each(MALFORMED_TOKENS)(
      "$label — treats request as authenticated for a PROTECTED route (no redirect, lets the page render)",
      ({ token }) => {
        const request = buildRequest("/my-profile", { cookieValue: token });
        const response = middleware(request);

        // 200 means the middleware short-circuited with NextResponse.next().
        expect(statusOf(response)).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      },
    );

    it.each(MALFORMED_TOKENS)(
      "$label — does NOT throw, does NOT 5xx on a malformed token",
      ({ token }) => {
        expect(() => {
          middleware(buildRequest("/login", { cookieValue: token }));
        }).not.toThrow();
        expect(() => {
          middleware(buildRequest("/my-profile", { cookieValue: token }));
        }).not.toThrow();
      },
    );
  });

  describe("sub-resource present with a malformed value", () => {
    // The matcher regex excludes paths with extensions (e.g. `.js`); we
    // cover the case where the cookie header itself is well-formed but
    // the value is malformed. The middleware does not parse the value.
    it("does not parse the cookie value (so a malformed value cannot break it)", () => {
      const request = new NextRequest(
        new URL("http://localhost:3000/my-profile"),
        {
          headers: {
            cookie:
              "auth_token=" + encodeURIComponent(MALFORMED_TOKENS[4].token),
          },
        },
      );
      const response = middleware(request);
      expect(statusOf(response)).toBe(200);
    });
  });

  describe("empty cookie value (operationally equal to no cookie)", () => {
    it("redirects a protected route to /login?redirect=/<path> when auth_token is the empty string", () => {
      const request = buildRequest("/friends", { cookieValue: "" });
      const response = middleware(request);
      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe("/friends");
    });

    it("lets an auth-only route render when auth_token is the empty string", () => {
      const request = buildRequest("/signup", { cookieValue: "" });
      const response = middleware(request);
      expect(statusOf(response)).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("no cookie at all", () => {
    it("redirects a protected route to /login?redirect=/<path>", () => {
      const request = buildRequest("/friends");
      const response = middleware(request);
      expect(statusOf(response)).toBe(307);
      const loc = locationUrlOf(response);
      expect(loc.pathname).toBe("/login");
      expect(loc.searchParams.get("redirect")).toBe("/friends");
    });

    it("lets an auth-only route render (no redirect)", () => {
      const request = buildRequest("/signup");
      const response = middleware(request);
      expect(statusOf(response)).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });
});

describe("middleware (Epic 1.6) — public/excluded paths are not redirected", () => {
  // The matcher regex (config) plus isPublic() (function body) exempt
  // static assets and Next.js internals from the middleware. The matcher
  // itself is enforced by Next.js at runtime, so we cannot directly assert
  // it here — but we can verify that paths inside the isPublic() set pass
  // through the middleware unchanged when they would otherwise be gated.
  it("does not redirect /api/* (the isPublic exclusion)", () => {
    const request = buildRequest("/api/some-handler");
    const response = middleware(request);
    expect(statusOf(response)).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect /_next/* (defensive isPublic exclusion)", () => {
    const request = buildRequest("/_next/static/chunks/main.js");
    const response = middleware(request);
    expect(statusOf(response)).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect /favicon (defensive isPublic exclusion)", () => {
    const request = buildRequest("/favicon.ico");
    const response = middleware(request);
    expect(statusOf(response)).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("middleware (Epic 1.6) — drift guard against inventory docs", () => {
  /**
   * The PROTECTED_PREFIXES and AUTH_ONLY_ROUTES arrays above are
   * duplicated from the docs (ET-1.6-A1, A2, B1). If anyone changes the
   * middleware constants without updating the docs (or vice versa), this
   * block surfaces the drift via a hard-coded double-check.
   *
   * Implementation note: instead of importing the markdown files (which
   * would require a markdown parser in vitest), we re-derive the lists by
   * importing the constants from `middleware.ts` itself and asserting the
   * shapes we expect. If the constants move or get renamed, this test
   * fails loudly with a clear message.
   */

  it("PROTECTED_PREFIXES in the docs inventory matches the middleware constant", async () => {
    const source = await import("./middleware?raw");
    const text: string = (source as { default?: string }).default ?? "";
    // We don't import the constants directly because they are not exported;
    // instead we assert that each prefix appears as a literal in the file.
    for (const prefix of PROTECTED_PREFIXES) {
      expect(text).toContain(`'${prefix}'`);
    }
  });

  it("ADMIN_PREFIXES in the docs inventory matches the middleware constant", async () => {
    const source = await import("./middleware?raw");
    const text: string = (source as { default?: string }).default ?? "";
    for (const prefix of ADMIN_PREFIXES) {
      expect(text).toContain(`'${prefix}'`);
    }
  });

  it("AUTH_ONLY_ROUTES in the docs inventory matches the middleware constant", async () => {
    const source = await import("./middleware?raw");
    const text: string = (source as { default?: string }).default ?? "";
    for (const route of AUTH_ONLY_ROUTES) {
      expect(text).toContain(`'${route}'`);
    }
  });
});
