import { describe, expect, it } from 'vitest';
import { hasUsableSession } from '@/features/auth/utils/auth-cookies';

function makeJwt(payload: Record<string, unknown>): string {
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
'base64url'
);
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature = 'mock-signature';
return `${header}.${body}.${signature}`;
}

function makeRequestWithCookie(token: string | null): Request {
const cookieValue = token ? `auth_token=${encodeURIComponent(token)}` : '';
return new Request('http://localhost/', {
headers: token ? { cookie: cookieValue } : {},
  });
}

describe('hasUsableSession', () => {
it('rejects request with no auth_token cookie', () => {
const request = new Request('http://localhost/');
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects request with empty cookie header', () => {
const request = new Request('http://localhost/', {
headers: { cookie: '' },
  });
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects malformed token', () => {
const request = makeRequestWithCookie('not-a-jwt');
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects token with only 2 parts', () => {
const request = makeRequestWithCookie('header.payload');
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects token with only 1 part', () => {
const request = makeRequestWithCookie('header');
expect(hasUsableSession(request)).toBe(false);
  });

it('accepts structurally valid unexpired token', () => {
const token = makeJwt({
sub: 'user-123',
exp: Math.floor(Date.now() / 1000) + 3600,
  });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(true);
  });

it('accepts structurally valid token without exp claim', () => {
const token = makeJwt({ sub: 'user-123' });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(true);
  });

it('rejects expired token', () => {
const token = makeJwt({
sub: 'user-123',
exp: Math.floor(Date.now() / 1000) - 60,
  });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects token expired exactly at current time', () => {
const token = makeJwt({
sub: 'user-123',
exp: Math.floor(Date.now() / 1000),
  });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects token with NaN exp claim', () => {
const token = makeJwt({
sub: 'user-123',
exp: Number.NaN,
  });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(true);
  });

  it('rejects token with negative exp claim', () => {
const token = makeJwt({
sub: 'user-123',
exp: -1,
  });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(false);
  });

it('rejects token with undecodable payload', () => {
const header = Buffer.from('{}').toString('base64url');
const request = makeRequestWithCookie(`${header}.!!!.sig`);
expect(hasUsableSession(request)).toBe(false);
  });

it('decodes URL-encoded token from cookie header', () => {
const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
const request = makeRequestWithCookie(token);
expect(hasUsableSession(request)).toBe(true);
  });

it('extracts auth_token when other cookies are also present', () => {
const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
const request = new Request('http://localhost/', {
headers: {
cookie: `foo=bar; auth_token=${encodeURIComponent(token)}; baz=qux`,
    },
  });
expect(hasUsableSession(request)).toBe(true);
  });
});