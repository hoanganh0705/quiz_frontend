

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

resolver: zodResolver(options.schema) as never,
    });
methodsRef = methods;

const Provider = FormProvider as unknown as React.ComponentType<{
children?: React.ReactNode;
    }>;
return (
<Provider

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

export const wrapWithFormProvider = renderWithFormProvider;
