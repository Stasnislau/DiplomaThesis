import '@testing-library/jest-dom';

import * as usePlacementTaskHook from '../api/hooks/usePlacementTask';
import * as usePlacementTestStoreHook from '@/store/usePlacementTestStore';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import PlacementTaskContainer from './PlacementTaskContainer';
import { UserAnswer } from '@/store/usePlacementTestStore';

vi.mock('@/components/layout/Loading', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));
vi.mock('./PlacementTask', () => ({
  PlacementTask: ({ onAnswer, task }: { onAnswer: (answer: UserAnswer) => void; task: { question: string } }) => (
    <div data-testid="placement-task">
      <div>Task Question: {task.question}</div>
      <button
        onClick={() =>
          onAnswer({
            userAnswer: 'Option A',
            isCorrect: true,
            questionNumber: 1,
            question: task.question,
          })
        }
      >
        Submit Answer
      </button>
    </div>
  ),
}));

describe('PlacementTaskContainer', () => {
  const mockCreateTask = vi.fn();
  const mockSetTasks = vi.fn();
  const mockAddAnswer = vi.fn();
  const mockAdvanceTasks = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(usePlacementTaskHook, 'usePlacementTask').mockReturnValue({
      createTask: mockCreateTask,
      isLoading: false,
      error: null,
    });
  });

  const setupStore = (overrides = {}) => {
    vi.spyOn(usePlacementTestStoreHook, 'usePlacementTestStore').mockReturnValue({
      language: { name: 'English' },
      currentQuestionNumber: 1,
      userAnswers: [],
      isTestComplete: false,
      testTotalQuestions: 5,
      currentTask: null,
      nextTask: null,
      addAnswer: mockAddAnswer,
      setTasks: mockSetTasks,
      setNextTask: vi.fn(),
      advanceTasks: mockAdvanceTasks,
      setLanguage: vi.fn(),
      resetTest: vi.fn(),
      setIsTestComplete: vi.fn(),
      setTestTotalQuestions: vi.fn(),
      ...overrides,
    });
  };

  it('renders loading spinner when initially loading', () => {
    vi.spyOn(usePlacementTaskHook, 'usePlacementTask').mockReturnValue({
      createTask: mockCreateTask,
      isLoading: true,
      error: null,
    });
    setupStore({ currentTask: null });

    render(<PlacementTaskContainer />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders PlacementTask when currentTask is available', () => {
    setupStore({
      currentTask: { question: 'What is 2+2?', options: [], type: 'multiple_choice' },
    });

    render(<PlacementTaskContainer />);
    expect(screen.getByTestId('placement-task')).toBeInTheDocument();
    expect(screen.getByText('Task Question: What is 2+2?')).toBeInTheDocument();
  });

  it('calls start logic (createTask) on mount if tasks are missing', async () => {
    setupStore({ currentTask: null, nextTask: null });
    mockCreateTask.mockResolvedValue({ question: 'New Task', type: 'mock' });

    render(<PlacementTaskContainer />);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
    });
  });

  it('handles answer submission correctly', async () => {
    const currentTask = { question: 'Test Q', options: ['A', 'B'], type: 'multiple_choice' };
    setupStore({
      currentTask,
      currentQuestionNumber: 1,
    });

    render(<PlacementTaskContainer />);

    const submitBtn = screen.getByText('Submit Answer');
    submitBtn.click();

    expect(mockAddAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        userAnswer: 'Option A',
        questionNumber: 1,
        question: 'Test Q',
      }),
      currentTask
    );

    expect(mockAdvanceTasks).toHaveBeenCalled();
  });
});
