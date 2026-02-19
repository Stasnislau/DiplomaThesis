import '@testing-library/jest-dom';

import * as useExplain from '@/api/hooks/useExplainAnswer';
import * as useFB from '@/api/hooks/useCreateBlankSpaceTask';
import * as useMC from '@/api/hooks/useCreateMultipleChoiceTask';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import WritingTask from './WritingTask';

// Mock child components
vi.mock('@/components/common/Tabs', () => ({
  Tabs: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div onClick={() => onValueChange && onValueChange('fill-blank')}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`content-${value}`}>{children}</div>
  ),
}));

vi.mock('@/pages/Quiz/components/TaskComponent', () => ({
  TaskComponent: ({ taskData }: { taskData: { question: string } }) => (
    <div data-testid="task-component">
      Task: {taskData.question}
    </div>
  ),
}));

describe('WritingTask', () => {
  const mockCreateMC = vi.fn();
  const mockCreateFB = vi.fn();
  const mockExplain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useMC, 'useCreateMultipleChoiceTask').mockReturnValue({
      createTask: mockCreateMC,
      isLoading: false,
      data: undefined,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    });

    vi.spyOn(useFB, 'useCreateBlankSpaceTask').mockReturnValue({
      createTask: mockCreateFB,
      isLoading: false,
      data: undefined,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    });

    vi.spyOn(useExplain, 'useExplainAnswer').mockReturnValue({
      explainAnswer: mockExplain,
      isLoading: false,
      data: undefined,
      error: null,
      isSuccess: false,
    });
  });

  it('renders language and level selectors', () => {
    render(<WritingTask />);
    expect(screen.getByText('Choose Language')).toBeInTheDocument();
    expect(screen.getByText('Proficiency Level')).toBeInTheDocument();
    
    // Check specific options exist
    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
  });

  it('disables generate button when language or level is not selected', () => {
    render(<WritingTask />);

    const generateBtn = screen.getByRole('button', { name: 'Generate Multiple Choice Task' });
    
    // Should be disabled initially
    expect(generateBtn).toBeDisabled();

    // Still disabled if only one is selected
    fireEvent.click(screen.getByText('Spanish'));
    expect(generateBtn).toBeDisabled();

    // Verify createTask is not called if we try to click
    fireEvent.click(generateBtn);
    expect(mockCreateMC).not.toHaveBeenCalled();
  });

  it('generates Multiple Choice task when selected', () => {
    render(<WritingTask />);

    // Select Language Spanish
    fireEvent.click(screen.getByText('Spanish'));
    
    // Select Level B1
    fireEvent.click(screen.getByText('B1'));

    // Click Generate MC
    const generateBtn = screen.getByRole('button', { name: 'Generate Multiple Choice Task' });
    fireEvent.click(generateBtn);

    expect(mockCreateMC).toHaveBeenCalledWith({ language: 'Spanish', level: 'B1' });
  });

  it('renders TaskComponent when data is returned', () => {
    // Mock data return
    vi.spyOn(useMC, 'useCreateMultipleChoiceTask').mockReturnValue({
      createTask: mockCreateMC,
      isLoading: false,
      data: { 
        id: '123',
        question: 'Generated Question', 
        type: 'multiple_choice',
        options: ['A', 'B'],
        correctAnswer: 'A'
      },
      error: null,
      isSuccess: true,
      reset: vi.fn(),
    });

    render(<WritingTask />);
    
    // The effect should pick up the data and render the task
    expect(screen.getByTestId('task-component')).toHaveTextContent('Task: Generated Question');
  });
});
