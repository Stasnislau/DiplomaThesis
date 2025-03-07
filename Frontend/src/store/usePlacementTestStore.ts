import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import { create } from "zustand";

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
}

export const usePlacementTestStore = create<PlacementTestStore>((set, get) => ({
  currentQuestionNumber: 0,
  userAnswers: [],
  cachedTasks: [],
  isTestComplete: false,
  addAnswer: (answer) =>
    set((state) => {
      const newAnswer = {
        ...answer,
        questionNumber: state.currentQuestionNumber,
      };

      return {
        userAnswers: [...state.userAnswers, newAnswer],
        currentQuestionNumber: state.currentQuestionNumber + 1,
        isTestComplete: state.currentQuestionNumber >= 10,
      };
    }),
  resetTest: () =>
    set({
      currentQuestionNumber: 1,
      userAnswers: [],
      cachedTasks: [],
      isTestComplete: false,
    }),
  addTask: (task: MultipleChoiceTask | FillInTheBlankTask) =>
    set((state) => ({
      cachedTasks: [...state.cachedTasks, task],
    })),
  getCurrentTask: () => {
    const { currentQuestionNumber, cachedTasks } = get();
    return cachedTasks[currentQuestionNumber - 1];
  },
  setCurrentQuestionNumber: (number: number) =>
    set({ currentQuestionNumber: number }),
}));
