import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import { create } from "zustand";
import { Language } from "@/api/hooks/useAvailableLanguages";

export interface UserAnswer {
  questionNumber: number;
  isCorrect: boolean;
  userAnswer: string;
}

interface PlacementTestStore {
  currentQuestionNumber: number;
  isTestComplete: boolean;
  userAnswers: UserAnswer[];
  cachedTasks: (MultipleChoiceTask | FillInTheBlankTask)[];
  addAnswer: (answer: UserAnswer) => void;
  resetTest: () => void;
  addTask: (task: MultipleChoiceTask | FillInTheBlankTask) => void;
  getCurrentTask: () => MultipleChoiceTask | FillInTheBlankTask | undefined;
  setCurrentQuestionNumber: (number: number) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

export const usePlacementTestStore = create<PlacementTestStore>((set, get) => ({
  currentQuestionNumber: 0,
  userAnswers: [],
  cachedTasks: [],
  isTestComplete: false,
  language: {} as Language,
  addAnswer: (answer) =>
    set((state) => {
      const newAnswer = {
        ...answer,
        questionNumber: state.currentQuestionNumber,
      };

      const isComplete = state.currentQuestionNumber >= 9; // 0-based indexing

      return {
        userAnswers: [...state.userAnswers, newAnswer],
        currentQuestionNumber: state.currentQuestionNumber + 1,
        isTestComplete: isComplete,
      };
    }),
  resetTest: () =>
    set({
      currentQuestionNumber: 0,
      userAnswers: [],
      cachedTasks: [],
      isTestComplete: false,
    }),
  addTask: (task) =>
    set((state) => {
      if (state.cachedTasks.some((t) => t.id === task.id)) {
        return state;
      }

      return {
        cachedTasks: [...state.cachedTasks, task],
      };
    }),
  getCurrentTask: () => {
    const { currentQuestionNumber, cachedTasks } = get();
    return cachedTasks[currentQuestionNumber];
  },
  setCurrentQuestionNumber: (number) =>
    set((state) => {
      if (number < 0 || number >= state.cachedTasks.length) {
        return state;
      }
      return { currentQuestionNumber: number };
    }),
  setLanguage: (language: Language) => set({ language }),
}));
