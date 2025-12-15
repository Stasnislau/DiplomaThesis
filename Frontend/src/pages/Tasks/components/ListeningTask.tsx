import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import { useCreateListeningTask } from "@/api/hooks/useCreateListeningTask";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "Italian", flag: "🇮🇹" }
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const ListeningTask = () => {
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [currentTaskData, setCurrentTaskData] = useState<ListeningTaskResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<(boolean | null)[]>([]);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  const { createListeningTask, isLoading, error, data, reset } = useCreateListeningTask();

  useEffect(() => {
    if (data) {
      setCurrentTaskData(data);
      setCurrentQuestionIndex(0);
      setUserAnswers(new Array(data.questions.length).fill(""));
      setIsCorrect(new Array(data.questions.length).fill(null));
      setShowTranscript(false);
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
  };

  const currentQuestion = currentTaskData?.questions[currentQuestionIndex];

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

      {/* Generate Button */}
      <Button
        onClick={handleCreateTask}
        disabled={!language || !level || isLoading}
        variant="primary"
        isLoading={isLoading}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
      >
        {isLoading ? "Generating..." : "🎧 Generate Listening Task"}
      </Button>

      {error && error.message && (
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
        <div className="space-y-4">
          {/* Audio Player Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🎧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Listening Task</h2>
                <p className="text-indigo-100 text-sm">Listen carefully and answer the questions</p>
              </div>
            </div>
            <audio src={currentTaskData.audioUrl} controls className="w-full rounded-xl" />
          </div>

          {/* Transcript Toggle */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between py-2 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <span className="text-lg">📜</span>
                </div>
                <span className="font-semibold text-gray-700">
                  {showTranscript ? "Hide Transcript" : "Show Transcript"}
                </span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${showTranscript ? "rotate-180" : ""}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTranscript && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{currentTaskData.transcript}</p>
              </div>
            )}
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Question {currentQuestionIndex + 1}</h3>
                    <p className="text-xs text-gray-500">of {currentTaskData.questions.length} questions</p>
                  </div>
                </div>
                
                {/* Progress dots */}
                <div className="flex items-center gap-1">
                  {currentTaskData.questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        idx === currentQuestionIndex
                          ? "w-6 bg-indigo-600"
                          : isCorrect[idx] === true
                          ? "bg-green-500"
                          : isCorrect[idx] === false
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <TaskComponent
                taskData={currentQuestion}
                userAnswer={userAnswers[currentQuestionIndex]}
                setUserAnswer={handleUserAnswerChange}
                onCheckAnswer={() => handleCheckAnswer(currentQuestionIndex)}
                onExplainAnswer={() => {}}
                isCorrect={isCorrect[currentQuestionIndex]}
                isExplaining={false}
                explanationData={undefined}
                showExplanation={false}
              />
              
              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <Button 
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} 
                  disabled={currentQuestionIndex === 0}
                  variant="secondary"
                  className="h-10 px-6 rounded-xl"
                >
                  ← Previous
                </Button>
                <Button 
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(currentTaskData.questions.length - 1, prev + 1))} 
                  disabled={currentQuestionIndex === currentTaskData.questions.length - 1}
                  variant="primary"
                  className="h-10 px-6 rounded-xl"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListeningTask;
