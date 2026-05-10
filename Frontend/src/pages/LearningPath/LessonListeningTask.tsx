import { useEffect, useState } from "react";

import Button from "@/components/common/Button";
import ListeningQuestionRenderer, {
  gradeListeningQuestion,
} from "@/pages/Tasks/components/ListeningRenderers";
import type {
  ListeningAnswerValue,
} from "@/pages/Tasks/components/ListeningRenderers";
import type { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import type { ListeningQuestion } from "@/types/responses/ListeningResponse";
import { useCreateListeningTask } from "@/api/hooks/useCreateListeningTask";
import { useTranslation } from "react-i18next";
import { logListeningResult } from "@/api/mutations/logListeningResult";

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
 *   - Auto-loads one task (audio + 3-4 mixed-format comprehension
 *     questions: MC, FIB, dictation, true/false/not-given, sentence
 *     completion, multi-speaker matching).
 *   - Walks the learner through each question with the same
 *     ListeningQuestionRenderer the free-practice page uses, so all
 *     six question types render identically in both contexts.
 *   - When all questions are answered, surfaces a per-question
 *     correct/wrong breakdown and calls onCompleted so the lesson
 *     page can mark the lesson complete on a passing score.
 */
const LessonListeningTask = ({
  language,
  level,
  onCompleted,
}: LessonListeningTaskProps) => {
  const { t } = useTranslation();

  const { createListeningTask, isLoading, error, data, reset } =
    useCreateListeningTask();
  // The backend response carries six possible question shapes via the
  // ListeningQuestion union; the legacy `ListeningTaskResponse` wrapper
  // typing predates that union, so we narrow once at the boundary.
  const [task, setTask] = useState<
    | (Omit<ListeningTaskResponse, "questions"> & {
        questions: ListeningQuestion[];
      })
    | null
  >(null);
  const [idx, setIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<
    Array<ListeningAnswerValue | undefined>
  >([]);
  const [correctness, setCorrectness] = useState<(boolean | null)[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!language || !level) return;
    setTask(null);
    setIdx(0);
    setUserAnswers([]);
    setCorrectness([]);
    setCompleted(false);
    reset();
    const backendLanguage =
      language.charAt(0).toUpperCase() + language.slice(1);
    createListeningTask({ language: backendLanguage, level });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level]);

  useEffect(() => {
    if (data) {
      // Cast through unknown — runtime has the rich ListeningQuestion
      // union, the legacy DTO type does not yet.
      const narrowed = data as unknown as Omit<
        ListeningTaskResponse,
        "questions"
      > & { questions: ListeningQuestion[] };
      setTask(narrowed);
      setUserAnswers(new Array(narrowed.questions.length).fill(undefined));
      setCorrectness(new Array(narrowed.questions.length).fill(null));
    }
  }, [data]);

  const total = task?.questions.length ?? 0;
  const correctCount = correctness.filter((c) => c === true).length;
  const allAnswered = total > 0 && correctness.every((c) => c !== null);

  useEffect(() => {
    if (!completed && allAnswered && total > 0) {
      setCompleted(true);
      onCompleted?.(correctCount, total);
      // Persist to history so the adaptive layer learns from
      // listening misses inside lessons (the standalone listening
      // surface logs separately). Fire-and-forget — don't block
      // lesson completion on a logging hiccup.
      if (task && language && level) {
        const score = Math.round((correctCount / total) * 100);
        const errorExamples = task.questions
          .map((q, i) => ({ q, verdict: correctness[i] }))
          .filter(({ verdict }) => verdict === false)
          .map(({ q }) => {
            let suggestion = "";
            switch (q.type) {
              case "multiple_choice":
              case "fill_in_the_blank":
              case "dictation":
                suggestion = String(q.correctAnswer);
                break;
              case "true_false_not_given":
                suggestion = q.correctAnswer;
                break;
              case "sentence_completion":
                suggestion = Array.isArray(q.correctAnswer)
                  ? q.correctAnswer.join(" / ")
                  : String(q.correctAnswer);
                break;
              case "multi_speaker_matching":
                suggestion = q.statements
                  .map((s) => `${s.statement} → ${s.correctSpeaker}`)
                  .join("; ");
                break;
            }
            return {
              type: q.type,
              text: q.question.slice(0, 160),
              suggestion: suggestion.slice(0, 160),
            };
          })
          .slice(0, 5);
        logListeningResult({
          language,
          level,
          score,
          questionCount: total,
          correctCount,
          questionTypes: Array.from(
            new Set(task.questions.map((q) => q.type)),
          ),
          errorExamples,
        }).catch((err) => {
          console.warn("logListeningResult (lesson) failed:", err);
        });
      }
    }
  }, [allAnswered, completed, correctCount, total, onCompleted, task, language, level, correctness]);

  const setAnswer = (a: ListeningAnswerValue) => {
    const next = [...userAnswers];
    next[idx] = a;
    setUserAnswers(next);
  };

  const handleCheck = () => {
    if (!task) return;
    const q = task.questions[idx];
    const ans = userAnswers[idx];
    const ok = gradeListeningQuestion(q, ans);
    const next = [...correctness];
    next[idx] = ok === null ? false : ok;
    setCorrectness(next);
  };

  const handleNext = () => {
    if (idx + 1 < total) setIdx(idx + 1);
  };

  const handleNewTask = () => {
    if (!language || !level) return;
    setTask(null);
    setIdx(0);
    setUserAnswers([]);
    setCorrectness([]);
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <ListeningQuestionRenderer
          question={currentQ}
          answer={userAnswers[idx]}
          onChange={setAnswer}
          revealed={currentAnswered}
        />
        <div className="mt-4 flex justify-end gap-2">
          {!currentAnswered && (
            <Button
              onClick={handleCheck}
              disabled={userAnswers[idx] === undefined}
            >
              {t("tasks.checkAnswer")}
            </Button>
          )}
          {currentAnswered && idx + 1 < total && (
            <Button onClick={handleNext}>
              {t("lessonListening.nextQuestion")}
            </Button>
          )}
        </div>
      </div>

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
