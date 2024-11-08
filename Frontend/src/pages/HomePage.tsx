import React, { useState, useEffect } from "react";
import { useCreateMultipleChoiceTask } from "../api/hooks/useCreateMultipleChoiceTask";
import { useCreateBlankSpaceTask } from "../api/hooks/useCreateBlankSpaceTask";
import { useExplainAnswer } from "../api/hooks/useExplainAnswer";
import { TaskData } from "@/types/responses/TaskResponse";
import { TaskComponent } from "../components/task/TaskComponent";

export const HomePage: React.FC = () => {
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTaskData, setCurrentTaskData] = useState<TaskData | null>(null);

  const {
    createTask,
    isLoading: isCreating,
    error: createError,
    data: taskData,
  } = useCreateMultipleChoiceTask();
  const { createTask: createBlankSpaceTask, data: blankSpaceTaskData } =
    useCreateBlankSpaceTask();
  const {
    explainAnswer,
    isLoading: isExplaining,
    data: explanationData,
  } = useExplainAnswer();

  const handleCreateTask = () => {
    if (language && level) {
      const taskType =
        Math.random() < 0.5 ? "multiple_choice" : "fill_in_the_blank";
      if (taskType === "multiple_choice") {
        createTask({ language, level });
      } else {
        createBlankSpaceTask({ language, level });
      }

      setUserAnswer("");
      setShowExplanation(false);
      setIsCorrect(null);
    } else {
      alert("Please select both language and level.");
    }
  };

  const handleCheckAnswer = () => {
    if (!currentTaskData || !userAnswer) return;

    let isAnswerCorrect = false;

    if (currentTaskData.type === "multiple_choice") {
      const optionIndexes = ["A", "B", "C", "D"];
      const correctOptionIndex = optionIndexes.indexOf(
        currentTaskData.correct_answer
      );
      if (!correctOptionIndex || !currentTaskData.options) return false;
      isAnswerCorrect =
        currentTaskData.options[correctOptionIndex] === userAnswer;
    } else {
      isAnswerCorrect =
        userAnswer.toLowerCase() ===
        currentTaskData.correct_answer.toLowerCase();
    }

    setIsCorrect(isAnswerCorrect);
    if (isAnswerCorrect) {
      alert("Correct answer!");
    }
  };

  useEffect(() => {
    if (taskData) {
      setCurrentTaskData(taskData);
    } else if (blankSpaceTaskData) {
      setCurrentTaskData(blankSpaceTaskData);
    }
  }, [taskData, blankSpaceTaskData]);

  const handleExplainAnswer = () => {
    console.log(currentTaskData, userAnswer);
    if (currentTaskData && userAnswer) {
      setShowExplanation(true);
      explainAnswer({
        language,
        level,
        task: currentTaskData.task,
        correct_answer: currentTaskData.correct_answer,
        user_answer: userAnswer,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-2xl sm:mx-auto w-full px-4">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl transition-all duration-300 hover:-rotate-3"></div>

        <div className="relative px-4 py-10 bg-white shadow-xl sm:rounded-3xl sm:p-20 transition-all duration-300">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="pb-8 text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                  Language Learning
                </h1>
                <p className="text-gray-500 text-sm">
                  Select your preferences and start learning
                </p>
              </div>

              <div className="py-8 space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-hover:text-indigo-600">
                    Choose Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white hover:bg-gray-50"
                  >
                    <option value="">Select a language</option>
                    {["Spanish", "French", "German", "Russian", "Polish"].map(
                      (lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Level Selector */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-hover:text-indigo-600">
                    Proficiency Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={`py-2 px-4 rounded-lg transition-all duration-200 ${
                          level === lvl
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={!language || !level || isCreating}
                  className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-all duration-300 transform hover:scale-[1.02] 
                    ${
                      !language || !level
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                    }`}
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating Task...
                    </span>
                  ) : (
                    "Create New Task"
                  )}
                </button>
              </div>
            </div>

            {createError && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">
                  Error: {createError.message}
                </p>
              </div>
            )}

            {currentTaskData && (
              <div className="mt-8">
                <TaskComponent
                  taskData={currentTaskData}
                  userAnswer={userAnswer}
                  setUserAnswer={setUserAnswer}
                  onCheckAnswer={handleCheckAnswer}
                  onExplainAnswer={handleExplainAnswer}
                  isCorrect={isCorrect}
                  isExplaining={isExplaining}
                  explanationData={explanationData}
                  showExplanation={showExplanation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
