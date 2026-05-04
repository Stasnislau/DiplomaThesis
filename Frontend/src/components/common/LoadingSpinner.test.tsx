import '@testing-library/jest-dom';

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with accessibility attributes', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByLabelText(/Loading/i);
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-busy', 'true');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-test" />);
    const spinner = screen.getByLabelText(/Loading/i);
    expect(spinner).toHaveClass('custom-test');
  });

  it('supports fullScreen mode', () => {
    render(<LoadingSpinner fullScreen />);
    const spinner = screen.getByRole('alert');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('fixed inset-0');
    expect(spinner).toHaveAttribute('aria-label', 'Content is loading');
  });

  it('applies backdrop blur in fullScreen mode', () => {
    render(<LoadingSpinner fullScreen />);
    const spinner = screen.getByRole('alert');
    expect(spinner).toHaveClass('backdrop-blur-sm');
  });
});
