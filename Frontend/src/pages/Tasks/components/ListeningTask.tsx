import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import { useCreateListeningTask } from "@/api/hooks/useCreateListeningTask";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";

const ListeningTask = () => {
    const [language, setLanguage] = useState("");
    const [level, setLevel] = useState("");
    const [currentTaskData, setCurrentTaskData] = useState<ListeningTaskResponse | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<string[]>([]);
    const [isCorrect, setIsCorrect] = useState<(boolean | null)[]>([]);

    const { createListeningTask, isLoading, error, data, reset } = useCreateListeningTask();

    useEffect(() => {
        if (data) {
            setCurrentTaskData(data);
            setCurrentQuestionIndex(0);
            setUserAnswers(new Array(data.questions.length).fill(""));
            setIsCorrect(new Array(data.questions.length).fill(null));
        }
    }, [data]);

    const handleCreateTask = () => {
        if (language && level) {
            reset();
            setCurrentTaskData(null);
            createListeningTask({ language, level });
        } else {
            alert("Please select both language and level.");
        }
    };

    const handleCheckAnswer = (questionIndex: number) => {
        const question = currentTaskData?.questions[questionIndex];
        const userAnswer = userAnswers[questionIndex];
        if (!question || !userAnswer) return;

        let isAnswerCorrect = false;
        if (isMultipleChoice(question)) {
            isAnswerCorrect = question.correctAnswer === userAnswer;
        } else {
            const correctAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer[0] : question.correctAnswer;
            isAnswerCorrect = correctAnswer.toLowerCase() === userAnswer.toLowerCase();
        }

        const newIsCorrect = [...isCorrect];
        newIsCorrect[questionIndex] = isAnswerCorrect;
        setIsCorrect(newIsCorrect);
    };

    const handleUserAnswerChange = (answer: string) => {
        const newUserAnswers = [...userAnswers];
        newUserAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newUserAnswers);
    }

    const currentQuestion = currentTaskData?.questions[currentQuestionIndex];

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
                        {["English", "Spanish", "French", "German", "Russian", "Polish", "Italian"].map(
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
                <Button
                    onClick={handleCreateTask}
                    disabled={!language || !level || isLoading}
                    variant="primary"
                    isLoading={isLoading}
                >
                    Create New Listening Task
                </Button>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">{error.message}</p>
                </div>
            )}

            {currentTaskData && (
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold mb-4">Listening Task</h2>
                    <audio src={currentTaskData.audioUrl} controls className="w-full mb-4" />

                    {currentQuestion && (
                        <TaskComponent
                            taskData={currentQuestion}
                            userAnswer={userAnswers[currentQuestionIndex]}
                            setUserAnswer={handleUserAnswerChange}
                            onCheckAnswer={() => handleCheckAnswer(currentQuestionIndex)}
                            onExplainAnswer={() => { /* TODO */ }}
                            isCorrect={isCorrect[currentQuestionIndex]}
                            isExplaining={false}
                            explanationData={undefined}
                            showExplanation={false}
                        />
                    )}
                     <div className="flex justify-between mt-4">
                        <Button onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>Previous</Button>
                        <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(currentTaskData.questions.length - 1, prev + 1))} disabled={currentQuestionIndex === currentTaskData.questions.length - 1}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListeningTask;
