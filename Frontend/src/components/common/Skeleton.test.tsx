import '@testing-library/jest-dom';

import { Skeleton, SkeletonCard, SkeletonTask, SkeletonText } from './Skeleton';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Skeleton', () => {
  describe('base Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('applies pulse animation by default', () => {
      render(<Skeleton />);
      expect(screen.getByRole('status')).toHaveClass('animate-pulse');
    });

    it('applies wave animation when specified', () => {
      render(<Skeleton animation="wave" />);
      expect(screen.getByRole('status')).toHaveClass('animate-shimmer');
    });

    it('applies no animation when specified', () => {
      render(<Skeleton animation="none" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).not.toHaveClass('animate-pulse');
      expect(skeleton).not.toHaveClass('animate-shimmer');
    });

    it('applies circular variant', () => {
      render(<Skeleton variant="circular" />);
      expect(screen.getByRole('status')).toHaveClass('rounded-full');
    });

    it('applies rectangular variant', () => {
      render(<Skeleton variant="rectangular" />);
      expect(screen.getByRole('status')).toHaveClass('rounded-none');
    });

    it('applies custom width and height', () => {
      render(<Skeleton width="w-32" height="h-8" />);
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('w-32');
      expect(skeleton).toHaveClass('h-8');
    });

    it('applies custom className', () => {
      render(<Skeleton className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('has proper accessibility label', () => {
      render(<Skeleton />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('SkeletonText', () => {
    it('renders default 3 lines', () => {
      render(<SkeletonText />);
      const container = screen.getByLabelText('Loading text...');
      expect(container.children).toHaveLength(3);
    });

    it('renders specified number of lines', () => {
      render(<SkeletonText lines={5} />);
      const container = screen.getByLabelText('Loading text...');
      expect(container.children).toHaveLength(5);
    });

    it('applies custom className', () => {
      render(<SkeletonText className="my-custom-class" />);
      const container = screen.getByLabelText('Loading text...');
      expect(container).toHaveClass('my-custom-class');
    });
  });

  describe('SkeletonCard', () => {
    it('renders card skeleton', () => {
      render(<SkeletonCard />);
      expect(screen.getByLabelText('Loading card...')).toBeInTheDocument();
    });

    it('has card styling', () => {
      render(<SkeletonCard />);
      const card = screen.getByLabelText('Loading card...');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('shadow-sm');
    });

    it('supports dark mode classes', () => {
      render(<SkeletonCard />);
      const card = screen.getByLabelText('Loading card...');
      expect(card).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('SkeletonTask', () => {
    it('renders task skeleton', () => {
      render(<SkeletonTask />);
      expect(screen.getByLabelText('Loading task...')).toBeInTheDocument();
    });

    it('has proper accessibility label', () => {
      render(<SkeletonTask />);
      expect(screen.getByLabelText('Loading task...')).toHaveAttribute('role', 'status');
    });
  });
});
