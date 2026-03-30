import '@testing-library/jest-dom';

import * as useListening from '@/api/hooks/useCreateListeningTask';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ListeningTask from './ListeningTask';

// Mock Audio element behavior minimally
window.HTMLMediaElement.prototype.play = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();

describe('ListeningTask Component', () => {
  const mockCreateTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useListening, 'useCreateListeningTask').mockReturnValue({
      createListeningTask: mockCreateTask,
      isLoading: false,
      data: undefined,
      error: null,
      reset: vi.fn(),
    });
  });

  it('renders correctly and has disabled generate button initially', () => {
    render(<ListeningTask />);
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: 'Generate Listening Task' });
    expect(generateBtn).toBeDisabled();
  });

  it('enables generate button when language and level are selected', () => {
    render(<ListeningTask />);
    
    // Select language
    fireEvent.click(screen.getByText('Spanish'));
    
    // Select level
    fireEvent.click(screen.getByText('B1'));

    const generateBtn = screen.getByRole('button', { name: 'Generate Listening Task' });
    expect(generateBtn).not.toBeDisabled();
    
    // Click generate
    fireEvent.click(generateBtn);
    expect(mockCreateTask).toHaveBeenCalledWith({ language: 'Spanish', level: 'B1' });
  });

  it('shows transcript toggle when data is loaded', () => {
    vi.spyOn(useListening, 'useCreateListeningTask').mockReturnValue({
      createListeningTask: mockCreateTask,
      isLoading: false,
      data: {
        type: 'listening',
        audioUrl: 'http://test.com/audio.mp3',
        transcript: 'Hola amigo',
        questions: [
          {
            id: 'task-1',
            type: 'multiple_choice',
            question: 'What did they say?',
            options: ['A', 'B'],
            correctAnswer: 'A'
          }
        ]
      },
      error: null,
      reset: vi.fn(),
    });

    render(<ListeningTask />);

    // Transcript toggle should be available
    expect(screen.getByText('Show Transcript')).toBeInTheDocument();
    
    // Toggle transcript
    const toggleBtn = screen.getByText('Show Transcript');
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Hola amigo')).toBeInTheDocument();
    expect(screen.getByText('Hide Transcript')).toBeInTheDocument();
  });
});
