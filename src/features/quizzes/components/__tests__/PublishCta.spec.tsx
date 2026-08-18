

import { useState } from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as nextNavigation from 'next/navigation';

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: vi.fn(),
replace: vi.fn(),
refresh: vi.fn(),
  }),
}));

const mockPublishVersion = vi.fn();
const mockUsePublishVersion = vi.fn(() => ({
publishVersion: mockPublishVersion,
isLoading: false,
error: null,
resetError: vi.fn(),
}));

vi.mock('@/features/quizzes/hooks/usePublishVersion', () => ({
usePublishVersion: (...args: unknown[]) => mockUsePublishVersion(...args),
}));

vi.mock('swr', () => ({
useSWRConfig: () => ({ mutate: vi.fn() }),
}));

import { PublishCta } from '@/features/quizzes/components/PublishCta';
import { PublishConfirmDialog } from '@/features/quizzes/components/PublishConfirmDialog';

function makeProps(overrides: {
isReady?: boolean;
isLoading?: boolean;
} = {}) {
const { isReady = true, isLoading = false } = overrides;

return {
quizId: 'quiz-123',
versionId: 'version-123',
slug: 'test-quiz',
isReady,
tooltipContent: isReady ? null : 'Add at least 5 questions to publish.',
isLoading,
  };
}

describe('PublishCta — rendering', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it('renders disabled button when isReady is false', () => {
const props = makeProps({ isReady: false });

render(<PublishCta {...props} />);

const button = screen.getByRole('button', { name: /publish quiz/i });
expect(button).toBeDisabled();
  });

it('renders enabled button when isReady is true', () => {
const props = makeProps({ isReady: true });

render(<PublishCta {...props} />);

const button = screen.getByRole('button', { name: /publish quiz/i });
expect(button).toBeEnabled();
  });

it('shows loading state when isLoading is true', () => {
const props = makeProps({ isReady: true, isLoading: true });

render(<PublishCta {...props} />);

const button = screen.getByRole('button');
expect(button).toBeDisabled();
expect(screen.getByText(/publishing/i)).toBeInTheDocument();
  });

it('calls publishVersion on click when enabled', async () => {
mockPublishVersion.mockResolvedValueOnce({
data: {
quizVersionId: 'version-123',
status: 'published',
      },
    });

const props = makeProps({ isReady: true });

render(<PublishCta {...props} />);

const button = screen.getByRole('button', { name: /publish quiz/i });
fireEvent.click(button);

await waitFor(() => {
expect(mockPublishVersion).toHaveBeenCalledWith('quiz-123', 'version-123');
    });
  });

it('does not call publishVersion on click when disabled', () => {
const props = makeProps({ isReady: false });

render(<PublishCta {...props} />);

const button = screen.getByRole('button', { name: /publish quiz/i });
fireEvent.click(button);

expect(mockPublishVersion).not.toHaveBeenCalled();
  });

it('does not call publishVersion when isLoading is true', () => {
const props = makeProps({ isReady: true, isLoading: true });

render(<PublishCta {...props} />);

const button = screen.getByRole('button', { name: /publishing/i });
fireEvent.click(button);

expect(mockPublishVersion).not.toHaveBeenCalled();
  });

it('calls onPublishStart when button is clicked', () => {
const onPublishStart = vi.fn();
const props = makeProps({ isReady: true });
mockPublishVersion.mockResolvedValueOnce({ data: { status: 'published' } });

render(<PublishCta {...props} onPublishStart={onPublishStart} />);

const button = screen.getByRole('button', { name: /publish quiz/i });
fireEvent.click(button);

expect(onPublishStart).toHaveBeenCalledTimes(1);
  });
});

describe('PublishConfirmDialog — rendering', () => {
it('renders with correct title', () => {
render(
<PublishConfirmDialog
open={true}
onConfirm={vi.fn()}
onCancel={vi.fn()}
      />
    );

expect(screen.getByText('Publish this quiz?')).toBeInTheDocument();
  });

it('renders with quiz title in body', () => {
render(
<PublishConfirmDialog
open={true}
quizTitle="My Test Quiz"
onConfirm={vi.fn()}
onCancel={vi.fn()}
      />
    );

expect(screen.getByText(/My Test Quiz/)).toBeInTheDocument();
  });

it('renders publish-specific body copy', () => {
render(
<PublishConfirmDialog
open={true}
onConfirm={vi.fn()}
onCancel={vi.fn()}
      />
    );

expect(screen.getByText(/Publishing makes this version permanent/)).toBeInTheDocument();
expect(screen.getByText(/discoverable on \/quizzes/)).toBeInTheDocument();
  });

it('renders cancel and publish buttons', () => {
render(
<PublishConfirmDialog
open={true}
onConfirm={vi.fn()}
onCancel={vi.fn()}
      />
    );

expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
  });

it('calls onConfirm when publish button is clicked', () => {
const onConfirm = vi.fn();
const onCancel = vi.fn();

render(
<PublishConfirmDialog
open={true}
onConfirm={onConfirm}
onCancel={onCancel}
      />
    );

const publishButton = screen.getByRole('button', { name: /^publish$/i });
fireEvent.click(publishButton);

expect(onConfirm).toHaveBeenCalledTimes(1);
  });

it('calls onCancel when cancel button is clicked', () => {
const onConfirm = vi.fn();
const onCancel = vi.fn();

render(
<PublishConfirmDialog
open={true}
onConfirm={onConfirm}
onCancel={onCancel}
      />
    );

const cancelButton = screen.getByRole('button', { name: /cancel/i });
fireEvent.click(cancelButton);

expect(onCancel).toHaveBeenCalled();
  });

it('disables publish button when loading is true', () => {
render(
<PublishConfirmDialog
open={true}
onConfirm={vi.fn()}
onCancel={vi.fn()}
loading={true}
      />
    );

const publishButton = screen.getByRole('button', { name: /publishing/i });
expect(publishButton).toBeDisabled();
  });

it('shows "Publishing..." text when loading', () => {
render(
<PublishConfirmDialog
open={true}
onConfirm={vi.fn()}
onCancel={vi.fn()}
loading={true}
      />
    );

expect(screen.getByText(/^Publishing\.\.\.$/)).toBeInTheDocument();
  });
});

describe('PublishCta + PublishConfirmDialog — full flow', () => {
function IntegrationTest() {
const [showConfirm, setShowConfirm] = useState(false);
const props = makeProps({ isReady: true });

return (
<>
<PublishCta
{...props}
onPublishStart={() => setShowConfirm(true)}
        />
<PublishConfirmDialog
open={showConfirm}
quizTitle="Test Quiz"
onConfirm={() => {
setShowConfirm(false);
          }}
onCancel={() => setShowConfirm(false)}
        />
</>
    );
  }

it('opens confirm dialog on publish button click', () => {
render(<IntegrationTest />);

expect(screen.queryByText('Publish this quiz?')).not.toBeInTheDocument();

const publishButton = screen.getByRole('button', { name: /publish quiz/i });
fireEvent.click(publishButton);

expect(screen.getByText('Publish this quiz?')).toBeInTheDocument();
  });

it('closes confirm dialog on cancel', () => {
render(<IntegrationTest />);

const publishButton = screen.getByRole('button', { name: /publish quiz/i });
fireEvent.click(publishButton);

expect(screen.getByText('Publish this quiz?')).toBeInTheDocument();

const cancelButton = screen.getByRole('button', { name: /cancel/i });
fireEvent.click(cancelButton);

expect(screen.queryByText('Publish this quiz?')).not.toBeInTheDocument();
  });
});
