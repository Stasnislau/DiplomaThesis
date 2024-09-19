import React, { useState } from "react";
import { useCreateTask } from "../api/hooks/useCreateTask";
import { useExplainAnswer } from "../api/hooks/useExplainAnswer";

export const HomePage: React.FC = () => {
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    createTask,
    isLoading: isCreating,
    error: createError,
    data: taskData,
  } = useCreateTask();
  const {
    explainAnswer,
    isLoading: isExplaining,
    error: explainError,
    data: explanationData,
  } = useExplainAnswer();

  const handleCreateTask = () => {
    if (language && level) {
      createTask({ language, level });
      setUserAnswer("");
      setShowExplanation(false);
    } else {
      alert("Please select both language and level.");
    }
  };

  const handleCheckAnswer = () => {
    if (taskData && userAnswer) {
      if (userAnswer.toLowerCase() === taskData.correct_answer.toLowerCase()) {
        setIsCorrect(true);
        alert("Correct answer!");
      } else {
        setIsCorrect(false);
      }
    }
  };

  const handleExplainAnswer = () => {
    if (taskData && userAnswer) {
      explainAnswer({
        language,
        level,
        task: taskData.task,
        correct_answer: taskData.correct_answer,
        user_answer: userAnswer,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
              Language Learning Task
            </h1>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-gray-700"
                >
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a language</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Russian">Russian</option>
                  <option value="Polish">Polish</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="level"
                  className="block text-sm font-medium text-gray-700"
                >
                  Level
                </label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a level</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>

              <button
                onClick={handleCreateTask}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
              >
                Create Task
              </button>
            </div>

            {isCreating && (
              <p className="mt-3 text-center text-sm text-indigo-600">
                Creating task...
              </p>
            )}
            {createError && (
              <p className="mt-3 text-center text-sm text-red-600">
                Error: {createError.message}
              </p>
            )}

            {taskData && (
              <div className="mt-6 space-y-4">
                <p className="text-lg font-medium text-gray-900">
                  Task: {taskData.task}
                </p>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Your answer"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleCheckAnswer}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out"
                >
                  Check Answer
                </button>
                {isCorrect === false && (
                  <>
                    <p className="mt-3 text-center text-sm text-red-600">
                      Incorrect answer.
                    </p>
                    <p className="mt-3 text-center text-sm text-red-600">
                      Correct answer: {taskData.correct_answer}
                    </p>
                  </>
                )}
                {isCorrect === false && (
                  <button
                    onClick={handleExplainAnswer}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-150 ease-in-out"
                  >
                    Get Explanation
                  </button>
                )}
              </div>
            )}

            {isExplaining && (
              <p className="mt-3 text-center text-sm text-indigo-600">
                Getting explanation...
              </p>
            )}
            {explainError && (
              <p className="mt-3 text-center text-sm text-red-600">
                Error: {explainError.message}
              </p>
            )}

            {explanationData && (
              <div className="mt-4 p-4 border rounded-md bg-gray-50">
                <p className="text-lg text-gray-800">
                  {explanationData.explanation}
                </p>
                {explanationData.topics_to_review && (
                  <p className="mt-2 text-sm text-gray-600">
                    Topics to review:{" "}
                    {explanationData.topics_to_review.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
