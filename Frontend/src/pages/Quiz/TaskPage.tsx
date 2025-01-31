import React, { useState, useEffect } from "react";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { TaskData } from "@/types/responses/TaskResponse";
import { TaskComponent } from "@/components/task/TaskComponent";
import Button from "@/components/common/Button";
import { useCreateTask } from "@/api/hooks/useCreateTask";

export const TaskPage: React.FC = () => {
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTaskData, setCurrentTaskData] = useState<TaskData | null>(null);
  const { createTask, isLoading, error, data } = useCreateTask();
  const {
    explainAnswer,
    isLoading: isExplaining,
    data: explanationData,
  } = useExplainAnswer();

  const handleCreateTask = () => {
    if (language && level) {
      setCurrentTaskData(null);

      const taskType =
        // Math.random() < 0.5 ? "multiple_choice" : "fill_in_the_blank";
        "multiple_choice";

      createTask({ language, level, taskType });

      setUserAnswer("");
      setShowExplanation(false);
      setIsCorrect(null);
    } else {
      alert("Please select both language and level.");
    }
  };

  useEffect(() => {
    if (language || level) {
      setCurrentTaskData(null);
    }
  }, [language, level]);

  const handleCheckAnswer = () => {
    if (!currentTaskData || !userAnswer) return;

    let isAnswerCorrect = false;
    if (currentTaskData.type === "multiple_choice") {
      const correctOptionIndex = currentTaskData?.options?.indexOf(
        currentTaskData.correct_answer
      );
      if (correctOptionIndex === undefined || !currentTaskData.options) return;
      isAnswerCorrect =
        currentTaskData.options[correctOptionIndex] === userAnswer;
    } else {
      isAnswerCorrect =
        userAnswer.toLowerCase() ===
        currentTaskData.correct_answer.toLowerCase();
    }
    setIsCorrect(isAnswerCorrect);
  };

  useEffect(() => {
    if (data && !currentTaskData && !isLoading) {
      setCurrentTaskData(data);
    }
  }, [data, isLoading]);

  const handleExplainAnswer = () => {
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

                <Button
                  onClick={handleCreateTask}
                  disabled={!language || !level || isLoading}
                  variant="primary"
                  isLoading={isLoading}
                >
                  Create New Task
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">Error: {error.message}</p>
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
