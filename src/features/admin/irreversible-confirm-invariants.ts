

import {
getIrreversibleConfirmString,
IRREVERSIBLE_OPERATIONS,
} from './admin-capabilities';

export const IRREVERSIBLE_CONFIRM_MIN_LENGTH = 8;

export const IRREVERSIBLE_CONFIRM_DOCUMENTATION = Object.freeze({
minLength: IRREVERSIBLE_CONFIRM_MIN_LENGTH,
caseSensitive: true,
whitespaceSensitive: true,
backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED' as const,
});

export const IRREVERSIBLE_INVARIANTS = Object.freeze({
minLength: (s: string) => s.length >= IRREVERSIBLE_CONFIRM_MIN_LENGTH,
caseSensitive: (s: string) => s === s.toUpperCase(),
whitespaceSensitive: (s: string) => /\s/.test(s),
nonTrivial: (s: string) =>
/[A-Z]/.test(s) && s.trim().length >= IRREVERSIBLE_CONFIRM_MIN_LENGTH,
});

export type IrreversibleInvariantCheck = keyof typeof IRREVERSIBLE_INVARIANTS;

export function validateIrreversibleConfirm(
candidate: string,
check: IrreversibleInvariantCheck,
): boolean {
return IRREVERSIBLE_INVARIANTS[check](candidate);
}

export function isFullyValidConfirm(candidate: string): boolean {
return (Object.keys(IRREVERSIBLE_INVARIANTS) as IrreversibleInvariantCheck[]).every(
(check) => validateIrreversibleConfirm(candidate, check),
  );
}

export function findBrokenIrreversibleInvariants(): readonly string[] {
const broken: string[] = [];
for (const entry of IRREVERSIBLE_OPERATIONS) {
if (!isFullyValidConfirm(entry.confirmString)) {
broken.push(entry.operation);
    }
  }
return broken;
}

export function findDuplicateIrreversibleConfirmStrings(): readonly string[] {
const seen = new Map<string, string[]>();
for (const entry of IRREVERSIBLE_OPERATIONS) {
const list = seen.get(entry.confirmString) ?? [];
list.push(entry.operation);
seen.set(entry.confirmString, list);
  }
return Array.from(seen.values())
    .filter((ops) => ops.length > 1)
    .flat();
}

export function assertIrreversibleInvariantsHold(): void {
const broken = findBrokenIrreversibleInvariants();
if (broken.length > 0) {
throw new Error(
`irreversible-confirm-invariants: ${broken.join(', ')} has an invalid confirm string`,
    );
  }
const dups = findDuplicateIrreversibleConfirmStrings();
if (dups.length > 0) {
throw new Error(
`irreversible-confirm-invariants: duplicate confirm strings for ${dups.join(', ')}`,
    );
  }
if (
IRREVERSIBLE_CONFIRM_MIN_LENGTH < 8 ||
IRREVERSIBLE_CONFIRM_DOCUMENTATION.backendCode !==
'IRREVERSIBLE_CONFIRM_REQUIRED'
  ) {
throw new Error('irreversible-confirm-invariants: documentation drift');
  }
void getIrreversibleConfirmString;
}
