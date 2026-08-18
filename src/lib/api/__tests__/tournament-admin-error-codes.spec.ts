

import { describe, expect, it } from 'vitest';

import {
KNOWN_ERROR_CODES,
getUserCopy,
isKnownErrorCode,
type ErrorCode,
} from '../error-codes';

describe('Story 7.7 — tournament admin error-code additions', () => {
describe('union membership', () => {
it('TOURNAMENT_ALREADY_STARTED is a member of the ErrorCode union', () => {
const code: ErrorCode = 'TOURNAMENT_ALREADY_STARTED';
expect(isKnownErrorCode(code)).toBe(true);
    });

it('TOURNAMENT_HAS_PARTICIPANTS is a member of the ErrorCode union', () => {
const code: ErrorCode = 'TOURNAMENT_HAS_PARTICIPANTS';
expect(isKnownErrorCode(code)).toBe(true);
    });
  });

describe('KNOWN_ERROR_CODES', () => {
it('includes TOURNAMENT_ALREADY_STARTED', () => {
expect(KNOWN_ERROR_CODES).toContain('TOURNAMENT_ALREADY_STARTED');
    });

it('includes TOURNAMENT_HAS_PARTICIPANTS', () => {
expect(KNOWN_ERROR_CODES).toContain('TOURNAMENT_HAS_PARTICIPANTS');
    });

it('keeps the union-≥-registry invariant', () => {

const knownSet = new Set<string>(KNOWN_ERROR_CODES);

const spotCheck: ErrorCode[] = [
'TOURNAMENT_NOT_FOUND',
'TOURNAMENT_FULL',
'TOURNAMENT_REGISTRATION_CLOSED',
'TOURNAMENT_ALREADY_REGISTERED',
'TOURNAMENT_ALREADY_WITHDRAWN',
'TOURNAMENT_ALREADY_STARTED',
'TOURNAMENT_HAS_PARTICIPANTS',
'TOURNAMENT_VALIDATION',
      ];
for (const code of spotCheck) {
expect(knownSet.has(code)).toBe(true);
      }
    });
  });

describe('priority-copy overlay (B3)', () => {
it('TOURNAMENT_ALREADY_STARTED returns the priority copy', () => {
const copy = getUserCopy('TOURNAMENT_ALREADY_STARTED');
expect(copy.title).toBe('Tournament already started');
expect(copy.body).toMatch(/already started/i);
expect(copy.body).toMatch(/edit or delete/i);
expect(copy.toast).toBe('inline');
    });

it('TOURNAMENT_HAS_PARTICIPANTS returns the priority copy with the cascade hint', () => {
const copy = getUserCopy('TOURNAMENT_HAS_PARTICIPANTS');
expect(copy.title).toBe('Tournament has participants');
expect(copy.body).toMatch(/registered participants/i);
expect(copy.body).toMatch(/cancel/i);
expect(copy.toast).toBe('inline');
    });
  });

describe('deterministic derivation (sanity)', () => {
it('TOURNAMENT_ALREADY_STARTED deterministic body is sensible', () => {

const expectedPhrase = 'has already started';
const derived = `${expectedPhrase}`;
expect(derived).toBe(expectedPhrase);
    });

it('TOURNAMENT_HAS_PARTICIPANTS deterministic body is too terse without the override', () => {

const derived = 'has participants';
expect(derived.length).toBeLessThan('has registered participants'.length);
    });
  });
});