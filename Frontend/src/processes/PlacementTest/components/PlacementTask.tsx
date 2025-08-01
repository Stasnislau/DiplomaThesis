import React, { useCallback, useState } from "react";
import {
  FillInTheBlankTask,
  MultipleChoiceTask,
} from "@/types/responses/TaskResponse";
import Button from "@/components/common/Button";
import { motion } from "framer-motion";
import { UserAnswer } from "@/store/usePlacementTestStore";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { isArray } from "framer/utils/utils.js";
import LoadingSpinner from "@/components/common/LoadingSpinner";
interface PlacementTaskComponentProps {
  task: MultipleChoiceTask | FillInTheBlankTask;
  onAnswer: (answer: UserAnswer) => void;
  currentQuestion: number;
  isLoading: boolean;
}

export const PlacementTask: React.FC<PlacementTaskComponentProps> = ({
  task,
  onAnswer,
  currentQuestion,
  isLoading,
}) => {
  const [userAnswer, setUserAnswer] = useState("");

  const handleSubmit = () => {
    if (!userAnswer) return;

    onAnswer({
      isCorrect: isArray(task.correctAnswer) ? task.correctAnswer.includes(userAnswer) : task.correctAnswer === userAnswer,
      userAnswer,
      questionNumber: currentQuestion,
    });
    setUserAnswer("");
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

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
                  : "bg-white hover:bg-gray-50 border-gray-200 hover:border-indigo-300"
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
            className="w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            placeholder="Type your answer here..."
          />
        </div>
      );
    }
  }, [task, userAnswer]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              task.type === "multiple_choice"
                ? "bg-blue-100 text-blue-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {task.type === "multiple_choice"
              ? "Multiple Choice"
              : "Fill in the Blank"}
          </span>
        </div>
        <p className="text-xl font-medium text-gray-900">{task.question}</p>
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
