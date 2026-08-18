'use client';

import { useCallback, useMemo, useState } from 'react';

import {
IRREVERSIBLE_INVARIANTS,
isFullyValidConfirm,
} from '../irreversible-confirm-invariants';
import {
getIrreversibleConfirmString,
type IrreversibleAdminOperation,
} from '../admin-capabilities';

export interface UseTypedConfirm {

confirmString: string;

input: string;

matches: boolean;

isFullyValid: boolean;

hasInput: boolean;

setInput: (next: string) => void;

reset: () => void;

assertedConfirm: () => string;
}

export function useTypedConfirm(
operation: IrreversibleAdminOperation,
): UseTypedConfirm {
const confirmString = getIrreversibleConfirmString(operation) ?? '';
const [input, setInputState] = useState('');

const matches = useMemo(() => input === confirmString, [input, confirmString]);
const hasInput = useMemo(() => input.length > 0, [input]);
const isFullyValid = useMemo(
() => input.length > 0 && isFullyValidConfirm(input),
[input],
  );

const setInput = useCallback((next: string) => setInputState(next), []);
const reset = useCallback(() => setInputState(''), []);

const assertedConfirm = useCallback((): string => {
if (!confirmString) {
throw new Error(
`useTypedConfirm: unknown irreversible operation "${operation}"`,
      );
    }
if (!matches || !isFullyValid) {
throw new Error(
`useTypedConfirm: typed confirm did not match for "${operation}"`,
      );
    }

const failed = (Object.keys(IRREVERSIBLE_INVARIANTS) as Array<
keyof typeof IRREVERSIBLE_INVARIANTS
    >).filter((check) => !IRREVERSIBLE_INVARIANTS[check](input));
if (failed.length > 0) {
throw new Error(
`useTypedConfirm: invariants failed for "${operation}" (${failed.join(', ')})`,
      );
    }
return confirmString;
  }, [confirmString, input, matches, isFullyValid, operation]);

return {
confirmString,
input,
matches,
isFullyValid,
hasInput,
setInput,
reset,
assertedConfirm,
  };
}
