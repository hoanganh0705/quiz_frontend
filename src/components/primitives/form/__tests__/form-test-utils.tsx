/**
 * Test helpers for Phase 4 form-atom primitives.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 *
 * `renderWithFormProvider` mounts a component inside a `FormProvider`
 * whose `methods` come from `useForm({ resolver: zodResolver(schema) })`.
 * The resolver is wired because the atoms read `formState.errors[name]`
 * via `useController`, and the only way to populate those errors in a
 * test is to drive the schema. Without a resolver, `methods.trigger()`
 * would silently "pass" and the atom's error-message assertion would
 * never find anything.
 *
 * The helper also returns the `methods` instance so tests can call
 * `methods.trigger(name)`, `methods.setValue(name, value)`, and
 * `methods.getValues(name)` directly. `wrapWithFormProvider` is kept
 * as an alias for backwards compatibility with the B1 spec.
 */

import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import {
  FormProvider,
  useForm,
  type UseFormReturn,
  type FieldValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

export interface RenderWithFormProviderOptions<
  T extends z.ZodType<FieldValues, any, any>
> {
  schema: T;
  defaultValues: z.infer<T>;
}

/**
 * Render `ui` inside a `FormProvider` powered by a `useForm` instance
 * wired to a zod resolver. Returns the testing-library result + the
 * `methods` so tests can read + write form state directly.
 */
export function renderWithFormProvider<
  T extends z.ZodType<FieldValues, any, any>
>(
  ui: React.ReactElement,
  options: RenderWithFormProviderOptions<T>
): RenderResult & { methods: UseFormReturn<z.infer<T>> } {
  let methodsRef: UseFormReturn<z.infer<T>> | null = null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const methods = useForm<z.infer<T>, unknown, z.infer<T>>({
      defaultValues: options.defaultValues,
      // The atom specs only need the resolver to populate `formState.errors`
      // when `methods.trigger()` is called. The cast mirrors the runtime
      // pattern in `useQuizForm` (TKT-4.2.A1) which uses `as never` to
      // bridge zod's `input`/`output` type differences.
      resolver: zodResolver(options.schema) as never,
    });
    methodsRef = methods;
    // Spread + cast — `FormProviderProps` is `UseFormReturn & { children }`,
    // and `useForm`'s return value is assignable once we widen the type.
    const Provider = FormProvider as unknown as React.ComponentType<{
      children?: React.ReactNode;
    }>;
    return (
      <Provider
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(methods as any)}
      >
        {children}
      </Provider>
    );
  };

  const result = render(<Wrapper>{ui}</Wrapper>);
  if (!methodsRef) {
    throw new Error(
      '[form-test-utils] FormProvider did not mount; the wrapper ref is null. ' +
        'This is an internal bug — please file a ticket.'
    );
  }
  return Object.assign(result, { methods: methodsRef });
}

/**
 * Backwards-compatible alias. Older specs imported `wrapWithFormProvider`;
 * the semantics are identical to `renderWithFormProvider`.
 */
export const wrapWithFormProvider = renderWithFormProvider;
