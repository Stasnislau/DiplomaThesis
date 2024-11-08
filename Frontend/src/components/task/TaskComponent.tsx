import React, { useCallback } from "react";
import { TaskData } from "@/types/responses/TaskResponse";

interface TaskComponentProps {
  taskData: TaskData;
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  onCheckAnswer: () => void;
  onExplainAnswer: () => void;
  isCorrect: boolean | null;
  isExplaining: boolean;
  explanationData?: {
    explanation: string;
    topics_to_review?: string[];
  };
  showExplanation: boolean;
}

export const TaskComponent: React.FC<TaskComponentProps> = ({
  taskData,
  userAnswer,
  setUserAnswer,
  onCheckAnswer,
  onExplainAnswer,
  isCorrect,
  isExplaining,
  explanationData,
  showExplanation,
}) => {
  const renderAnswerInput = useCallback(() => {
    switch (taskData.type) {
      case "multiple_choice":
        return (
          <div className="grid grid-cols-2 gap-4">
            {taskData.options?.map((option, index) => (
              <button
                key={option}
                onClick={() => setUserAnswer(option)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                  userAnswer === option
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-lg"
                    : "bg-white hover:bg-gray-50 border-gray-200 hover:border-indigo-300"
                }`}
              >
                <span className="block text-xs mb-1 opacity-70">
                  Option {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium">{option}</span>
              </button>
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
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {userAnswer && (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </div>
          </div>
        );
    }
  }, [taskData.type, userAnswer, setUserAnswer, taskData.options]);

  return (
    <div className="mt-6 space-y-6">
      {/* Task Header */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            taskData.type === "multiple_choice"
              ? "bg-blue-100 text-blue-800"
              : "bg-purple-100 text-purple-800"
          }`}>
            {taskData.type === "multiple_choice" ? "Multiple Choice" : "Fill in the Blank"}
          </span>
        </div>
        <p className="text-xl font-medium text-gray-900">{taskData.task}</p>
      </div>

      {/* Answer Section */}
      <div className="space-y-4">
        {renderAnswerInput()}

        <button
          onClick={onCheckAnswer}
          disabled={!userAnswer}
          className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] ${
            !userAnswer
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          Check Answer
        </button>
      </div>

      {/* Results Section */}
      {isCorrect !== null && (
        <div className={`mt-6 p-6 rounded-xl border ${
          isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center">
            {isCorrect ? (
              <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className={`font-medium ${isCorrect ? "text-green-800" : "text-red-800"}`}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
          </div>

          {!isCorrect && (
            <div className="mt-4 space-y-4">
              <p className="text-red-600">Correct answer: {taskData.correct_answer}</p>
              <button
                onClick={onExplainAnswer}
                className="w-full py-2 px-4 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors duration-200"
              >
                Get Explanation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Explanation Section */}
      {isExplaining && (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      )}

      {explanationData && showExplanation && (
        <div className="mt-6 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
          <h3 className="text-lg font-semibold text-indigo-900 mb-3">Explanation</h3>
          <p className="text-indigo-800">{explanationData.explanation}</p>
          {explanationData.topics_to_review && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">Topics to Review:</h4>
              <div className="flex flex-wrap gap-2">
                {explanationData.topics_to_review.map((topic) => (
                  <span key={topic} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
