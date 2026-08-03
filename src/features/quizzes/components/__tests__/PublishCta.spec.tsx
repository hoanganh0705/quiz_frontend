/**
 * `PublishCta.spec.tsx` — integration tests for PublishCta + PublishConfirmDialog.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.9.
 *
 * Tests the PublishCta and PublishConfirmDialog components for:
 * - Disabled state when not ready
 * - Enabled state when ready
 * - Loading spinner shows during mutation
 * - Confirm dialog renders with correct copy
 * - Dialog calls onConfirm/onCancel correctly
 */

import { useState } from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as nextNavigation from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the usePublishVersion hook
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

// Mock SWR
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));

// Import after mocks
import { PublishCta } from '@/features/quizzes/components/PublishCta';
import { PublishConfirmDialog } from '@/features/quizzes/components/PublishConfirmDialog';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PublishCta tests
// ---------------------------------------------------------------------------

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

    // Called once on button click (before isLoading becomes true)
    expect(onPublishStart).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// PublishConfirmDialog tests
// ---------------------------------------------------------------------------

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

    // Check for the specific Epic 4.11 copy
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

    // Radix AlertDialog calls onCancel when closing, which may trigger multiple times
    // Just verify it's called at least once
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

// ---------------------------------------------------------------------------
// Full flow integration
// ---------------------------------------------------------------------------

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

    // Initially dialog is closed
    expect(screen.queryByText('Publish this quiz?')).not.toBeInTheDocument();

    // Click publish button
    const publishButton = screen.getByRole('button', { name: /publish quiz/i });
    fireEvent.click(publishButton);

    // Dialog should be open
    expect(screen.getByText('Publish this quiz?')).toBeInTheDocument();
  });

  it('closes confirm dialog on cancel', () => {
    render(<IntegrationTest />);

    // Open dialog
    const publishButton = screen.getByRole('button', { name: /publish quiz/i });
    fireEvent.click(publishButton);

    // Dialog is open
    expect(screen.getByText('Publish this quiz?')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Dialog is closed
    expect(screen.queryByText('Publish this quiz?')).not.toBeInTheDocument();
  });
});
