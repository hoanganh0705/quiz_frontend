import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokenFromRequest } from '@/features/auth/utils/auth-cookies'

// Routes that require an authenticated user
const PROTECTED_PREFIXES = [
  '/bookmarks',
  '/create-quiz',
  '/discussions',
  '/friends',
  '/my-profile',
  '/onboarding',
  '/quiz-history',
  '/settings',
  '/tournament'
] as const

// Routes that should redirect authenticated users away (auth pages)
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/resend-verification', '/verify-email'] as const

// Admin routes — require admin role (checked server-side; here we guard by auth only)
const ADMIN_PREFIXES = ['/admin'] as const

// Routes that never redirect
const PUBLIC_ROUTES = ['/api', '/_next', '/favicon', '/manifest', '/sw'] as const

function isProtected(pathname: string): boolean {
  return [...PROTECTED_PREFIXES, ...ADMIN_PREFIXES].some((p) => pathname.startsWith(p))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r))
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files, Next.js internals, and API routes
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const token = getAuthTokenFromRequest(request)
  const isAuthenticated = !!token

  // ── Guard: protected routes ──────────────────────────────────────────────────
  if (isProtected(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Guard: already authenticated → redirect away from auth pages ─────────────
  if (isAuthRoute(pathname) && isAuthenticated) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    if (redirectParam) {
      const dest = new URL(redirectParam, request.url)
      if (dest.pathname !== pathname) {
        return NextResponse.redirect(dest)
      }
    }
    // Default redirect for authenticated users on auth pages
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, etc.
     * - Files with extensions (e.g. .png, .svg)
     */
    '/((?!_next/static|_next/image|favicon|robots|sitemap|.*\\..*$).*)'
  ]
}
