import '@testing-library/jest-dom';

import * as useExplain from '@/api/hooks/useExplainAnswer';
import * as useFB from '@/api/hooks/useCreateBlankSpaceTask';
import * as useMC from '@/api/hooks/useCreateMultipleChoiceTask';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import WritingTask from './WritingTask';

// Minimal stub of react-i18next that returns canned English strings
// without going through the real provider. We must still re-export
// `initReactI18next` because `@/config/i18n` (transitively imported
// via fetchWithAuth) calls `i18n.use(initReactI18next).init(...)` at
// module load time and would otherwise crash on undefined.
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'languages.chooseLanguage': 'Choose Language',
        'languages.proficiencyLevel': 'Proficiency Level',
        'tasks.multipleChoice': 'Multiple Choice',
        'tasks.fillInBlank': 'Fill in the Blank',
        'tasks.taskType': 'Task Type',
        'tasks.generateTask': 'Generate Task',
        'tasks.checkAnswer': 'Check Answer',
        'tasks.correct': 'Correct!',
        'tasks.incorrect': 'Incorrect',
        'tasks.showExplanation': 'Show Explanation',
        'languages.spanish': 'Spanish',
        'languages.french': 'French',
        'languages.german': 'German',
        'languages.russian': 'Russian',
        'languages.polish': 'Polish',
        'languages.english': 'English',
        'languages.italian': 'Italian',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

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

    expect(screen.getByText('Spanish')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
  });

  it('disables generate button when language or level is not selected', () => {
    render(<WritingTask />);

    const generateBtn = screen.getAllByRole('button', { name: 'Generate Task' })[0];

    expect(generateBtn).toBeDisabled();

    fireEvent.click(screen.getByText('Spanish'));
    expect(generateBtn).toBeDisabled();

    fireEvent.click(generateBtn);
    expect(mockCreateMC).not.toHaveBeenCalled();
  });

  it('generates Multiple Choice task when selected', () => {
    render(<WritingTask />);

    fireEvent.click(screen.getByText('Spanish'));

    fireEvent.click(screen.getByText('B1'));

    const generateBtn = screen.getAllByRole('button', { name: 'Generate Task' })[0];
    fireEvent.click(generateBtn);

    expect(mockCreateMC).toHaveBeenCalledWith({ language: 'Spanish', level: 'B1' });
  });

  it('renders TaskComponent when data is returned', () => {
    vi.spyOn(useMC, 'useCreateMultipleChoiceTask').mockReturnValue({
      createTask: mockCreateMC,
      isLoading: false,
      data: {
        id: '123',
        question: 'Generated Question',
        type: 'multiple_choice',
        options: ['A', 'B'],
        correctAnswer: 'A',
      },
      error: null,
      isSuccess: true,
      reset: vi.fn(),
    });

    render(<WritingTask />);

    expect(screen.getByTestId('task-component')).toHaveTextContent('Task: Generated Question');
  });
});
