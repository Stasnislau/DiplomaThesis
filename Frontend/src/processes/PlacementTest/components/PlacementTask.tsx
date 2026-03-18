import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import React, { useCallback, useState } from "react";

import Button from "@/components/common/Button";
import { UserAnswer } from "@/store/usePlacementTestStore";
import { isAnswerCorrect } from "@/utils/answerValidation";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { motion } from "framer-motion";

interface PlacementTaskComponentProps {
  task: MultipleChoiceTask | FillInTheBlankTask;
  onAnswer: (answer: UserAnswer) => void;
  currentQuestion: number;
}

export const PlacementTask: React.FC<PlacementTaskComponentProps> = ({
  task,
  onAnswer,
  currentQuestion,
}) => {
  const [userAnswer, setUserAnswer] = useState("");

  const handleSubmit = () => {
    if (!userAnswer) return;

    let correct: boolean;
    if (isMultipleChoice(task)) {
      const ca = task.correctAnswer;
      correct = Array.isArray(ca) ? ca.includes(userAnswer) : ca === userAnswer;
    } else {
      correct = isAnswerCorrect(userAnswer, task.correctAnswer, {
        tolerance: 2,
        ignoreCase: true,
        trim: true,
      });
    }

    onAnswer({
      isCorrect: correct,
      userAnswer,
      questionNumber: currentQuestion,
      question: task.question,
    });
    setUserAnswer("");
  };


  const renderAnswerInput = useCallback(() => {
    if (isMultipleChoice(task)) {
      return (
        <div className="grid grid-cols-2 gap-4">
          {task.options?.map((option, index) => (
            <motion.button
              key={option}
              onClick={() => setUserAnswer(option)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                userAnswer === option
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-lg"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-900 dark:text-gray-100"
              }`}
            >
              <span className="block text-xs mb-1 opacity-70">
                Option {String.fromCharCode(65 + index)}
              </span>
              <span className="font-medium">{option}</span>
            </motion.button>
          ))}
        </div>
      );
    } else {
      return (
        <div className="relative">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Type your answer here..."
          />
        </div>
      );
    }
  }, [task, userAnswer]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              task.type === "multiple_choice"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
            }`}
          >
            {task.type === "multiple_choice"
              ? "Multiple Choice"
              : "Fill in the Blank"}
          </span>
        </div>
        <p className="text-xl font-medium text-gray-900 dark:text-white">{task.question}</p>
      </div>

      <div className="space-y-4">
        {renderAnswerInput()}

        <Button
          onClick={handleSubmit}
          disabled={!userAnswer}
          variant="secondary"
        >
          Submit Answer
        </Button>
      </div>
    </div>
  );
};
