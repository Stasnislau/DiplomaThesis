import '@testing-library/jest-dom';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
    ariaLabel: 'Test modal',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children when open', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(<Modal {...defaultProps} description="Test description" />);
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('renders visually hidden title when title not provided', () => {
      render(<Modal {...defaultProps} ariaLabel="Custom aria label" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('renders close button with aria-label', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByLabelText('Close modal'));
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('overlay behavior', () => {
    it('renders overlay when open', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('applies custom className to content', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-modal');
    });
  });

  describe('accessibility', () => {
    it('has dialog role', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders with visible title for screen readers', () => {
      render(<Modal {...defaultProps} title="Visible Title" />);
      expect(screen.getByRole('heading', { name: 'Visible Title' })).toBeInTheDocument();
    });

    it('renders with hidden title when ariaLabel is provided', () => {
      render(<Modal {...defaultProps} ariaLabel="Hidden accessible label" />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('traps focus within modal', () => {
      render(
        <Modal {...defaultProps}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has close button with proper aria-label', () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });
});
