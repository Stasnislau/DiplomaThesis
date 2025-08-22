import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import { create } from "zustand";
import { Language } from "@/api/hooks/useAvailableLanguages";
import { TOTAL_QUESTIONS } from "@/constants";

export interface UserAnswer {
  questionNumber: number;
  isCorrect: boolean;
  userAnswer: string;
}

type Task = MultipleChoiceTask | FillInTheBlankTask;

interface PlacementTestStore {
  currentQuestionNumber: number;
  isTestComplete: boolean;
  userAnswers: UserAnswer[];
  cachedTasks: Task[]; // Add cachedTasks back
  addAnswer: (answer: UserAnswer, task: Task) => void; // Pass task to addAnswer
  resetTest: () => void;
  language: Language;
  setLanguage: (language: Language) => void;
  testTotalQuestions: number;
  currentTask: Task | null;
  nextTask: Task | null;
  setTasks: (tasks: { current: Task | null; next: Task | null }) => void;
  advanceTasks: () => void;
}

export const usePlacementTestStore = create<PlacementTestStore>((set) => ({
  currentQuestionNumber: 0,
  userAnswers: [],
  isTestComplete: false,
  language: {} as Language,
  testTotalQuestions: TOTAL_QUESTIONS,
  currentTask: null,
  nextTask: null,
  cachedTasks: [], // Add cachedTasks back
  addAnswer: (answer, task) => // Pass task to addAnswer
    set((state) => {
      const newAnswer = {
        ...answer,
        questionNumber: state.currentQuestionNumber,
      };

      const isComplete =
        state.currentQuestionNumber >= state.testTotalQuestions - 1;

      return {
        userAnswers: [...state.userAnswers, newAnswer],
        cachedTasks: [...state.cachedTasks, task], // Cache the answered task
        currentQuestionNumber: state.currentQuestionNumber + 1,
        isTestComplete: isComplete,
      };
    }),
  resetTest: () =>
    set({
      currentQuestionNumber: 0,
      userAnswers: [],
      isTestComplete: false,
      currentTask: null,
      nextTask: null,
      cachedTasks: [], // Reset cachedTasks
    }),
  setLanguage: (language: Language) => set({ language }),
  setTasks: (tasks) => set({ currentTask: tasks.current, nextTask: tasks.next }),
  advanceTasks: () =>
    set((state) => ({
      currentTask: state.nextTask,
      nextTask: null,
    })),
}));
