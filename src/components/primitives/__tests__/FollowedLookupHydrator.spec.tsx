

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const useFollowedLookupMock = vi.fn();

vi.mock('@/features/tags/hooks/useFollowedLookup', () => ({
useFollowedLookup: () => useFollowedLookupMock(),
}));

import { FollowedLookupHydrator } from '@/features/tags/components/FollowedLookupHydrator';

const DEFAULT_LOOKUP_RETURN = {
categories: new Set<string>(),
tags: new Set<string>(),
isLoading: false,
error: null,
mutate: async (): Promise<void> => {
return;
  },
};

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('<FollowedLookupHydrator />', () => {
it('(a) renders `null` and invokes useFollowedLookup on the first render', () => {
useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);

const { container } = render(<FollowedLookupHydrator />);

expect(container).toBeEmptyDOMElement();
expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);
  });

it('(b) is safe to compose with other sibling components in the same tree', () => {
useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);

const { container } = render(
<div data-testid='parent'>
<FollowedLookupHydrator />
<span data-testid='sibling'>hello</span>
</div>,
    );

expect(container).toBeInTheDocument();
expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);

expect(container.querySelector('[data-testid="sibling"]')).not.toBeNull();
  });

it('does not consume the lookup result — the hook call IS the hydration', () => {

useFollowedLookupMock.mockReturnValue({
...DEFAULT_LOOKUP_RETURN,
categories: new Set(['cat-1', 'cat-2', 'cat-3']),
tags: new Set(['tag-1']),
    });

const { container } = render(<FollowedLookupHydrator />);

expect(container).toBeEmptyDOMElement();

expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);
  });
});