import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";
import { useCreateMultipleChoiceTask } from "@/api/hooks/useCreateMultipleChoiceTask";
import { useCreateBlankSpaceTask } from "@/api/hooks/useCreateBlankSpaceTask";
import React, { useState, useEffect } from "react";
import { MultipleChoiceTask, FillInTheBlankTask } from "@/types/responses/TaskResponse";
import Button from "@/components/common/Button";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";

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
        <div>
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
                        {["Spanish", "French", "German", "Russian", "Polish", "English", "Italian"].map(
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
                                className={`py-2 px-4 rounded-lg transition-all duration-200 ${level === lvl
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Writing Tasks</h2>
            <Tabs defaultValue="multiple-choice" onValueChange={(value) => setTaskType(value as "multiple-choice" | "fill-blank")}>
                <TabsList>
                    <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
                    <TabsTrigger value="fill-blank">Fill in the Blank</TabsTrigger>
                </TabsList>
                <TabsContent value="multiple-choice">
                    <Button
                        onClick={handleCreateTask}
                        disabled={!language || !level || isLoading}
                        variant="primary"
                        isLoading={isLoading}
                    >
                        Create New Task
                    </Button>
                </TabsContent>
                <TabsContent value="fill-blank">
                    <Button
                        onClick={handleCreateTask}
                        disabled={!language || !level || isLoading}
                        variant="primary"
                        isLoading={isLoading}
                    >
                        Create New Task
                    </Button>
                </TabsContent>
            </Tabs>

            {error && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">{error.message}</p>
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
    );
};

export default WritingTask;
