import React, { useCallback, useState } from "react";
import { TaskData } from "@/types/responses/TaskResponse";
import { PlacementAnswer } from "@/types/Answer";
import Button from "@/components/common/Button";
import { motion } from "framer-motion";

interface PlacementTaskComponentProps {
  taskData: TaskData;
  onAnswer: (answer: PlacementAnswer) => void;
  currentQuestion: number;
  totalQuestions: number;
}

export const PlacementTaskComponent: React.FC<PlacementTaskComponentProps> = ({
  taskData,
  onAnswer,
  currentQuestion,
  totalQuestions,
}) => {
  const [userAnswer, setUserAnswer] = useState("");

  const handleSubmit = () => {
    if (!userAnswer) return;
    
    onAnswer({
      isCorrect: userAnswer === taskData.correct_answer,
      userAnswer,
      correctAnswer: taskData.correct_answer,
      questionNumber: currentQuestion,
    });
    setUserAnswer("");
  };

  const renderAnswerInput = useCallback(() => {
    switch (taskData.type) {
      case "multiple_choice":
        return (
          <div className="grid grid-cols-2 gap-4">
            {taskData.options?.map((option, index) => (
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

      default:
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
  }, [taskData.type, userAnswer, taskData.options]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Placement Test</h1>
        <span className="text-lg font-medium text-gray-600">
          Question {currentQuestion}/{totalQuestions}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 h-2 rounded-full">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentQuestion - 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              taskData.type === "multiple_choice"
                ? "bg-blue-100 text-blue-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {taskData.type === "multiple_choice"
              ? "Multiple Choice"
              : "Fill in the Blank"}
          </span>
        </div>
        <p className="text-xl font-medium text-gray-900">{taskData.task}</p>
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