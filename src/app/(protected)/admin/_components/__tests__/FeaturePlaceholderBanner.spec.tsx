/**
 * Unit tests for `FeaturePlaceholderBanner`.
 *
 * Coverage:
 *   - Renders the title and description nodes.
 *   - Renders the optional `codexLink` chip inside the description.
 *   - Renders an optional `cta` slot.
 *   - Applies `data-testid` when supplied.
 *   - Does not render the `codexLink` chip when not supplied (no
 *     orphaned period).
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { FeaturePlaceholderBanner } from '../FeaturePlaceholderBanner'

describe('FeaturePlaceholderBanner', () => {
  it('renders the title and description', () => {
    render(
      <FeaturePlaceholderBanner
        title='Admin user management coming soon'
        description='The user-management surface will be wired in a future phase.'
      />,
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Admin user management coming soon',
    )
    expect(screen.getByText(/user-management surface/i)).toBeInTheDocument()
  })

  it('renders the codexLink chip inside the description', () => {
    render(
      <FeaturePlaceholderBanner
        title='Coming soon'
        description='See the plan doc for details.'
        codexLink='useAdminUserList'
      />,
    )
    expect(screen.getByText('useAdminUserList')).toBeInTheDocument()
  })

  it('renders the optional cta slot', () => {
    render(
      <FeaturePlaceholderBanner
        title='Coming soon'
        description='See the plan doc.'
        cta={<a href='/admin/users/roles'>Manage roles in the meantime</a>}
      />,
    )
    const link = screen.getByRole('link', { name: /manage roles/i })
    expect(link).toHaveAttribute('href', '/admin/users/roles')
  })

  it('applies a data-testid when supplied', () => {
    render(
      <FeaturePlaceholderBanner
        title='Coming soon'
        description='Body.'
        testId='placeholder-banner'
      />,
    )
    expect(screen.getByTestId('placeholder-banner')).toBeInTheDocument()
  })

  it('does not render an orphaned period when codexLink is absent', () => {
    const { container } = render(
      <FeaturePlaceholderBanner title='Coming soon' description='Body.' />,
    )
    // No `code` element should appear.
    expect(container.querySelector('code')).toBeNull()
  })
})
