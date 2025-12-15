import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";
import { useCreateMultipleChoiceTask } from "@/api/hooks/useCreateMultipleChoiceTask";
import { useCreateBlankSpaceTask } from "@/api/hooks/useCreateBlankSpaceTask";
import React, { useState, useEffect } from "react";
import { MultipleChoiceTask, FillInTheBlankTask } from "@/types/responses/TaskResponse";
import Button from "@/components/common/Button";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";

const LANGUAGES = [
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "English", flag: "🇬🇧" },
  { code: "Italian", flag: "🇮🇹" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const WritingTask = () => {
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTaskData, setCurrentTaskData] = useState<MultipleChoiceTask | FillInTheBlankTask | null>(null);
  const [taskType, setTaskType] = useState<"multiple-choice" | "fill-blank">("multiple-choice");

  const { createTask: createMultipleChoice, isLoading: isLoadingMC, data: dataMC, error: errorMC } = useCreateMultipleChoiceTask();
  const { createTask: createFillBlank, isLoading: isLoadingFB, data: dataFB, error: errorFB } = useCreateBlankSpaceTask();

  const {
    explainAnswer,
    isLoading: isExplaining,
    data: explanationData,
  } = useExplainAnswer();

  const isLoading = isLoadingMC || isLoadingFB;
  const error = errorMC || errorFB;
  const data = dataMC || dataFB;

  const handleCreateTask = () => {
    if (language && level) {
      setCurrentTaskData(null);
      if (taskType === "multiple-choice") {
        createMultipleChoice({ language, level });
      } else {
        createFillBlank({ language, level });
      }
      setUserAnswer("");
      setShowExplanation(false);
      setIsCorrect(null);
    } else {
      alert("Please select both language and level.");
    }
  };

  useEffect(() => {
    if (data && !currentTaskData && !isLoading) {
      setCurrentTaskData(data);
    }
  }, [data, isLoading]);


  const handleCheckAnswer = () => {
    if (!currentTaskData || !userAnswer) return;

    let isAnswerCorrect = false;
    if (!currentTaskData) return;
    console.log(currentTaskData, userAnswer);
    if (isMultipleChoice(currentTaskData)) {
      const correctOptionIndex = currentTaskData?.options?.indexOf(
        Array.isArray(currentTaskData.correctAnswer) ? currentTaskData.correctAnswer[0] : currentTaskData.correctAnswer
      );
      if (correctOptionIndex === undefined || !currentTaskData.options) return;
      isAnswerCorrect =
        currentTaskData.options[correctOptionIndex] === userAnswer;
    } else {
      console.log(currentTaskData.correctAnswer, userAnswer, currentTaskData.correctAnswer === userAnswer, "fill in the blank");
      isAnswerCorrect = currentTaskData.correctAnswer === userAnswer;
    }
    setIsCorrect(isAnswerCorrect);
  };

  const handleExplainAnswer = () => {
    if (currentTaskData && userAnswer) {
      setShowExplanation(true);
      explainAnswer({
        language,
        level,
        task: currentTaskData.question,
        correctAnswer: Array.isArray(currentTaskData.correctAnswer) ? currentTaskData.correctAnswer[0] : currentTaskData.correctAnswer,
        userAnswer: userAnswer,
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <span className="text-lg">🌍</span>
          </div>
          <label className="text-sm font-semibold text-gray-800">
            Choose Language
          </label>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 ${
                language === lang.code
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200"
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-xs">{lang.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Selection */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <label className="text-sm font-semibold text-gray-800">
            Proficiency Level
          </label>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                level === lvl
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Task Type Selection */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <span className="text-lg">✍️</span>
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Task Type</h2>
        </div>
        
        <Tabs defaultValue="multiple-choice" onValueChange={(value) => setTaskType(value as "multiple-choice" | "fill-blank")}>
          <TabsList className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl mb-4">
            <TabsTrigger 
              value="multiple-choice"
              className="rounded-lg py-3 px-4 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600"
            >
              <span className="mr-2">🔘</span>
              Multiple Choice
            </TabsTrigger>
            <TabsTrigger 
              value="fill-blank"
              className="rounded-lg py-3 px-4 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-600"
            >
              <span className="mr-2">📝</span>
              Fill in the Blank
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="multiple-choice">
            <Button
              onClick={handleCreateTask}
              disabled={!language || !level || isLoading}
              variant="primary"
              isLoading={isLoading}
              className="w-full h-12 rounded-xl font-semibold"
            >
              Generate Multiple Choice Task
            </Button>
          </TabsContent>
          <TabsContent value="fill-blank">
            <Button
              onClick={handleCreateTask}
              disabled={!language || !level || isLoading}
              variant="primary"
              isLoading={isLoading}
              className="w-full h-12 rounded-xl font-semibold"
            >
              Generate Fill in the Blank Task
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <p className="text-sm text-red-600 font-medium">{error.message}</p>
          </div>
        </div>
      )}

      {currentTaskData && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-lg">🎯</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Your Task</h3>
          </div>
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
  );
};

export default WritingTask;
