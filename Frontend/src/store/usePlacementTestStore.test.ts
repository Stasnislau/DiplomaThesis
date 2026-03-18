import { beforeEach, describe, expect, it } from "vitest";

import { LanguageLevel } from "@/types/models/LanguageLevel";
import { act } from "@testing-library/react";
import { usePlacementTestStore } from "./usePlacementTestStore";

describe("usePlacementTestStore", () => {
  beforeEach(() => {
    act(() => {
      usePlacementTestStore.getState().resetTest();
    });
  });

  describe("initial state", () => {
    it("starts with question number 0", () => {
      const state = usePlacementTestStore.getState();
      expect(state.currentQuestionNumber).toBe(0);
    });

    it("starts with empty user answers", () => {
      const state = usePlacementTestStore.getState();
      expect(state.userAnswers).toEqual([]);
    });

    it("starts with test not complete", () => {
      const state = usePlacementTestStore.getState();
      expect(state.isTestComplete).toBe(false);
    });

    it("starts with empty cached tasks", () => {
      const state = usePlacementTestStore.getState();
      expect(state.cachedTasks).toEqual([]);
    });

    it("starts with null current and next tasks", () => {
      const state = usePlacementTestStore.getState();
      expect(state.currentTask).toBe(null);
      expect(state.nextTask).toBe(null);
    });
  });

  describe("addAnswer", () => {
    it("adds an answer and increments question number", () => {
      const task = {
        id: "1",
        type: "multiple_choice" as const,
        question: "Test question?",
        options: ["A", "B", "C"],
        correctAnswer: "A",
      };

      const answer = {
        questionNumber: 0,
        isCorrect: true,
        userAnswer: "A",
        question: "Test question?",
      };

      act(() => {
        usePlacementTestStore.getState().addAnswer(answer, task);
      });

      const state = usePlacementTestStore.getState();
      expect(state.userAnswers).toHaveLength(1);
      expect(state.currentQuestionNumber).toBe(1);
      expect(state.cachedTasks).toHaveLength(1);
    });

    it("marks test as complete after reaching total questions", () => {
      const task = {
        id: "1",
        type: "multiple_choice" as const,
        question: "Test?",
        options: ["A", "B"],
        correctAnswer: "A",
      };

      const { testTotalQuestions } = usePlacementTestStore.getState();

      act(() => {
        for (let i = 0; i < testTotalQuestions; i++) {
          usePlacementTestStore.getState().addAnswer(
            {
              questionNumber: i,
              isCorrect: true,
              userAnswer: "A",
              question: `Question ${i}`,
            },
            { ...task, id: String(i) },
          );
        }
      });

      const state = usePlacementTestStore.getState();
      expect(state.isTestComplete).toBe(true);
    });
  });

  describe("resetTest", () => {
    it("resets all state to initial values", () => {
      const task = {
        id: "1",
        type: "fill_in_the_blank" as const,
        question: "Test?",
        correctAnswer: ["answer"],
      };

      act(() => {
        usePlacementTestStore.getState().addAnswer(
          {
            questionNumber: 0,
            isCorrect: true,
            userAnswer: "answer",
            question: "Test?",
          },
          task,
        );
      });

      act(() => {
        usePlacementTestStore.getState().resetTest();
      });

      const state = usePlacementTestStore.getState();
      expect(state.currentQuestionNumber).toBe(0);
      expect(state.userAnswers).toEqual([]);
      expect(state.isTestComplete).toBe(false);
      expect(state.cachedTasks).toEqual([]);
    });
  });

  describe("setLanguage", () => {
    it("sets the language", () => {
      const language = {
        id: "1",
        code: "en",
        name: "English",
        currentLevel: LanguageLevel.A0,
      };

      act(() => {
        usePlacementTestStore.getState().setLanguage(language);
      });

      const state = usePlacementTestStore.getState();
      expect(state.language).toEqual(language);
    });
  });

  describe("setTasks", () => {
    it("sets current and next tasks", () => {
      const currentTask = {
        id: "1",
        type: "multiple_choice" as const,
        question: "Current?",
        options: ["A", "B"],
        correctAnswer: ["A"],
      };

      const nextTask = {
        id: "2",
        type: "fill_in_the_blank" as const,
        question: "Next?",
        correctAnswer: ["answer"],
      };

      act(() => {
        usePlacementTestStore
          .getState()
          .setTasks({ current: currentTask, next: nextTask });
      });

      const state = usePlacementTestStore.getState();
      expect(state.currentTask).toEqual(currentTask);
      expect(state.nextTask).toEqual(nextTask);
    });
  });

  describe("advanceTasks", () => {
    it("moves next task to current and clears next", () => {
      const nextTask = {
        id: "2",
        type: "multiple_choice" as const,
        question: "Next becomes current?",
        options: ["Yes", "No"],
        correctAnswer: "Yes",
      };

      act(() => {
        usePlacementTestStore
          .getState()
          .setTasks({ current: null, next: nextTask });
      });

      act(() => {
        usePlacementTestStore.getState().advanceTasks();
      });

      const state = usePlacementTestStore.getState();
      expect(state.currentTask).toEqual(nextTask);
      expect(state.nextTask).toBe(null);
    });
  });
});
