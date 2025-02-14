import { create } from 'zustand';

interface Answer {
  questionNumber: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  taskType: 'fill_in_the_blank' | 'multiple_choice';
  question: string;
}

interface PlacementTestStore {
  currentQuestionNumber: number;
  answers: Answer[];
  isTestComplete: boolean;
  addAnswer: (answer: Omit<Answer, 'questionNumber'>) => void;
  resetTest: () => void;
}

export const usePlacementTestStore = create<PlacementTestStore>((set) => ({
  currentQuestionNumber: 1,
  answers: [],
  isTestComplete: false,
  addAnswer: (answer) =>
    set((state) => {
      const newAnswer = {
        ...answer,
        questionNumber: state.currentQuestionNumber,
      };
      
      return {
        answers: [...state.answers, newAnswer],
        currentQuestionNumber: state.currentQuestionNumber + 1,
        isTestComplete: state.currentQuestionNumber >= 10,
      };
    }),
  resetTest: () =>
    set({
      currentQuestionNumber: 1,
      answers: [],
      isTestComplete: false,
    }),
})); 