import { useEffect, useState } from "react";

import Button from "@/components/common/Button";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isAnswerCorrect } from "@/utils/answerValidation";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { useCreateListeningTask } from "@/api/hooks/useCreateListeningTask";
import { useTranslation } from "react-i18next";

interface LessonListeningTaskProps {
  language: string;
  level: string;
  /** Fired once with the final correct-count when the user has
   *  answered every question. Lesson page decides pass/fail
   *  (>= 60% correct). */
  onCompleted?: (correctCount: number, totalCount: number) => void;
}

/**
 * Single listening exercise scoped to a lesson:
 *   - Auto-loads one task (audio + 3-4 comprehension questions).
 *   - Walks the learner through each question with the same TaskComponent
 *     used in the standard quiz flow.
 *   - When all questions are answered, surfaces a per-question correct/
 *     wrong breakdown and calls onCompleted so the lesson page can
 *     mark the lesson complete on a passing score.
 */
const LessonListeningTask = ({
  language,
  level,
  onCompleted,
}: LessonListeningTaskProps) => {
  const { t } = useTranslation();

  const { createListeningTask, isLoading, error, data, reset } =
    useCreateListeningTask();
  const [task, setTask] = useState<ListeningTaskResponse | null>(null);
  const [idx, setIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [correctness, setCorrectness] = useState<(boolean | null)[]>([]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Backend sometimes returns Polish placement of `{language, level}`
  // capitalised; align to what /listening/task expects. Auto-fetch on
  // mount.
  useEffect(() => {
    if (!language || !level) return;
    setTask(null);
    setIdx(0);
    setUserAnswers([]);
    setCorrectness([]);
    setCurrentInput("");
    setCompleted(false);
    reset();
    const backendLanguage =
      language.charAt(0).toUpperCase() + language.slice(1);
    createListeningTask({ language: backendLanguage, level });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level]);

  useEffect(() => {
    if (data) {
      setTask(data);
      setUserAnswers(new Array(data.questions.length).fill(""));
      setCorrectness(new Array(data.questions.length).fill(null));
    }
  }, [data]);

  const total = task?.questions.length ?? 0;
  const correctCount = correctness.filter((c) => c === true).length;
  const allAnswered = total > 0 && correctness.every((c) => c !== null);

  // Fire onCompleted exactly once, after the last answer is checked.
  useEffect(() => {
    if (!completed && allAnswered && total > 0) {
      setCompleted(true);
      onCompleted?.(correctCount, total);
    }
  }, [allAnswered, completed, correctCount, total, onCompleted]);

  const handleCheck = () => {
    if (!task || !currentInput) return;
    const q = task.questions[idx];
    let ok = false;
    if (isMultipleChoice(q)) {
      ok = q.correctAnswer === currentInput;
    } else {
      ok = isAnswerCorrect(currentInput, q.correctAnswer as string | string[], {
        tolerance: 2,
        ignoreCase: true,
        trim: true,
      });
    }
    const nextAnswers = [...userAnswers];
    nextAnswers[idx] = currentInput;
    setUserAnswers(nextAnswers);
    const nextC = [...correctness];
    nextC[idx] = ok;
    setCorrectness(nextC);
  };

  const handleNext = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setCurrentInput("");
    }
  };

  const handleNewTask = () => {
    if (!language || !level) return;
    setTask(null);
    setIdx(0);
    setUserAnswers([]);
    setCorrectness([]);
    setCurrentInput("");
    setCompleted(false);
    reset();
    const backendLanguage =
      language.charAt(0).toUpperCase() + language.slice(1);
    createListeningTask({ language: backendLanguage, level });
  };

  if (isLoading && !task) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-300">
          {t("lessonListening.generating")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6"
      >
        <p className="text-red-700 dark:text-red-300 mb-3">{error.message}</p>
        <Button onClick={handleNewTask}>{t("essay.tryAgain")}</Button>
      </div>
    );
  }

  if (!task) return null;

  const currentQ = task.questions[idx];
  const currentAnswered = correctness[idx] !== null;

  return (
    <div className="space-y-5">
      {/* Audio player */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs px-2 py-1 rounded-full">
            👂 {t("lessonListening.label")}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("lessonListening.questionCounter", {
              current: Math.min(idx + 1, total),
              total,
            })}
          </span>
        </div>
        <audio
          src={task.audioUrl}
          controls
          className="w-full rounded-xl"
          aria-label={t("lessonListening.audioLabel")}
        />
        <button
          type="button"
          className="mt-3 text-xs text-gray-500 dark:text-gray-400 underline hover:text-cyan-600 dark:hover:text-cyan-400"
          onClick={() => setShowTranscript((v) => !v)}
        >
          {showTranscript
            ? t("lessonListening.hideTranscript")
            : t("lessonListening.showTranscript")}
        </button>
        {showTranscript && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg whitespace-pre-wrap">
            {task.transcript}
          </p>
        )}
      </div>

      {/* Current question */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <TaskComponent
          taskData={currentQ}
          userAnswer={currentAnswered ? userAnswers[idx] : currentInput}
          setUserAnswer={(val: string) => setCurrentInput(val)}
          onCheckAnswer={handleCheck}
          onExplainAnswer={() => { /* explanations not surfaced in lesson listening */ }}
          isCorrect={correctness[idx]}
          isExplaining={false}
          showExplanation={false}
        />
        {currentAnswered && idx + 1 < total && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleNext}>
              {t("lessonListening.nextQuestion")}
            </Button>
          </div>
        )}
      </div>

      {/* Final summary */}
      {allAnswered && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("lessonListening.summary", { correct: correctCount, total })}
          </p>
          <p
            className={`inline-block text-xs px-2 py-1 rounded-full ${
              correctCount / total >= 0.6
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            }`}
          >
            {correctCount / total >= 0.6
              ? t("essay.passed")
              : t("essay.notPassed")}
          </p>
          <div className="mt-4">
            <Button onClick={handleNewTask}>
              {t("lessonListening.tryAnother")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonListeningTask;
