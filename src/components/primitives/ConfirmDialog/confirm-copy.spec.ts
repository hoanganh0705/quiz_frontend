

import { describe, expect, it } from 'vitest';

import {
CONFIRM_COPY,
CONFIRM_KINDS,
getConfirmCopy,
type ConfirmCopy,
type ConfirmKind,
} from './confirm-copy';

describe('confirm-copy — vocabulary', () => {
it('exposes exactly the 5 documented variants', () => {
expect(CONFIRM_KINDS).toHaveLength(5);
expect(CONFIRM_KINDS).toEqual([
'destructive-permanent',
'destructive-idempotent',
'state-changing',
'irreversible-flow',
'typed-confirm',
    ]);

for (const kind of CONFIRM_KINDS) {
expect(CONFIRM_COPY[kind]).toBeDefined();
    }
  });

it('every variant has non-empty title, body, confirmLabel, cancelLabel', () => {
for (const kind of CONFIRM_KINDS) {
const c: ConfirmCopy = CONFIRM_COPY[kind];
expect(c.title.length).toBeGreaterThan(0);
expect(c.body.length).toBeGreaterThan(0);
expect(c.confirmLabel.length).toBeGreaterThan(0);
expect(c.cancelLabel.length).toBeGreaterThan(0);
expect(['danger', 'warning', 'info']).toContain(c.tone);
    }
  });

it("destructive-permanent.body explicitly states permanence ('This cannot be undone.')", () => {
expect(CONFIRM_COPY['destructive-permanent'].body).toContain(
'This cannot be undone',
    );
  });

it("destructive-permanent.body contains a permanence language marker (the word 'permanently')", () => {

const body = CONFIRM_COPY['destructive-permanent'].body.toLowerCase();
expect(body).toMatch(/permanently|permanent/);
  });

it('typed-confirm variant sets typedString to a non-empty string', () => {
expect(typeof CONFIRM_COPY['typed-confirm'].typedString).toBe('string');
expect((CONFIRM_COPY['typed-confirm'].typedString ?? '').length).toBeGreaterThan(
0,
    );
  });

it('non-typed variants do NOT set typedString', () => {
for (const kind of CONFIRM_KINDS) {
if (kind === 'typed-confirm') continue;
expect(CONFIRM_COPY[kind].typedString).toBeUndefined();
    }
  });

it('tone is "danger" for permanent and typed-confirm; "warning" for idempotent + irreversible; "info" for state-changing', () => {
expect(CONFIRM_COPY['destructive-permanent'].tone).toBe('danger');
expect(CONFIRM_COPY['typed-confirm'].tone).toBe('danger');
expect(CONFIRM_COPY['destructive-idempotent'].tone).toBe('warning');
expect(CONFIRM_COPY['irreversible-flow'].tone).toBe('warning');
expect(CONFIRM_COPY['state-changing'].tone).toBe('info');
  });

it('getConfirmCopy returns the table row for every variant', () => {
const variants: ConfirmKind[] = [
'destructive-permanent',
'destructive-idempotent',
'state-changing',
'irreversible-flow',
'typed-confirm',
    ];
for (const v of variants) {
expect(getConfirmCopy(v)).toBe(CONFIRM_COPY[v]);
    }
  });

it('CONFIRM_COPY is frozen (immutability)', () => {
expect(Object.isFrozen(CONFIRM_COPY)).toBe(true);
  });
});
