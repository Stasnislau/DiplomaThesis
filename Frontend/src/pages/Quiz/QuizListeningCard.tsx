import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createListeningTask } from "@/api/mutations/createListeningTask";
import { logListeningResult } from "@/api/mutations/logListeningResult";
import type {
  ListeningQuestion,
  ListeningQuestionType,
} from "@/types/responses/ListeningResponse";
import type { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import ListeningQuestionRenderer, {
  gradeListeningQuestion,
  type ListeningAnswerValue,
} from "@/pages/Tasks/components/ListeningRenderers";
import Button from "@/components/common/Button";
import cn from "@/utils/cn";

interface QuizListeningCardProps {
  language: string;
  level: string;
  /** Sub-type the picker rolled. We forward a single-element list to
   *  the listening generator so it produces ONLY this variant —
   *  Quiz is meant to be quick-fire, not a 4-question session. */
  questionType: ListeningQuestionType;
}

/**
 * Quiz-route listening widget. Mounts when the picker rolls
 * `kind: "listening"`. Self-contained — fetches its own task,
 * streams audio inline, walks the user through the questions, and
 * fires `logListeningResult` once every question has been revealed.
 *
 * Why a separate component vs reusing ListeningTask: that one is a
 * standalone page with its own language/level pickers, adaptive
 * button, and full-width layout. We only want the question card
 * inside Quiz, so we mount the inner machinery directly.
 */
const QuizListeningCard = ({
  language,
  level,
  questionType,
}: QuizListeningCardProps) => {
  const { t } = useTranslation();
  const [data, setData] = useState<ListeningTaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ListeningAnswerValue>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  // Single-shot fetch on mount. Re-keying on language+level+questionType
  // would force a refetch but the parent already remounts via key
  // when those change, so the effect runs exactly once per session.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    createListeningTask({
      language,
      level,
      questionTypes: [questionType],
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("tasks.analysisFailed"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalQs = data?.questions.length ?? 0;
  const currentQuestion: ListeningQuestion | undefined = data?.questions[idx];
  const isCurrentRevealed = !!revealed[idx];
  const verdict =
    isCurrentRevealed && currentQuestion
      ? gradeListeningQuestion(currentQuestion, answers[idx])
      : null;

  // Once every question has been revealed, log the session result so
  // adaptive sees Quiz listening outcomes (errorExamples + score).
  // Mirrors the ListeningTask trigger; loggedRef prevents double-log
  // from re-renders.
  const loggedRef = useRef(false);
  useEffect(() => {
    if (!data || loggedRef.current) return;
    const revealedCount = Object.values(revealed).filter(Boolean).length;
    if (revealedCount < totalQs || totalQs === 0) return;
    loggedRef.current = true;

    let correct = 0;
    const errs: { type?: string; text?: string; suggestion?: string }[] = [];
    data.questions.forEach((q, i) => {
      const v = gradeListeningQuestion(q, answers[i]);
      if (v === true) correct += 1;
      else if (v === false) {
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
        errs.push({
          type: q.type,
          text: q.question.slice(0, 160),
          suggestion: suggestion.slice(0, 160),
        });
      }
    });
    const score = Math.round((correct / totalQs) * 100);
    logListeningResult({
      language,
      level,
      score,
      questionCount: totalQs,
      correctCount: correct,
      questionTypes: Array.from(new Set(data.questions.map((q) => q.type))),
      errorExamples: errs.slice(0, 5),
    }).catch((e) => {
      console.warn("logListeningResult (quiz) failed:", e);
    });
  }, [revealed, data, totalQs, answers, language, level]);

  const speakerChips = useMemo(
    () => data?.speakers ?? [],
    [data?.speakers],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10 p-8 text-center">
        <div className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-300 border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("lessonListening.generating")}
        </p>
      </div>
    );
  }

  if (error || !data || !currentQuestion) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
        {error || t("tasks.analysisFailed")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-300">
          🎧 {t(`tasks.questionType.${currentQuestion.type}`, {
            defaultValue: currentQuestion.type,
          })}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("lessonListening.questionCounter", {
            current: idx + 1,
            total: totalQs,
          })}
        </span>
      </div>

      <audio src={data.audioUrl} controls className="w-full rounded-xl" />

      {speakerChips.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {speakerChips.map((sp) => (
            <span
              key={sp}
              className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold"
            >
              🗣️ {sp}
            </span>
          ))}
        </div>
      )}

      {currentQuestion.type !== "sentence_completion" && (
        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
          {currentQuestion.question}
        </p>
      )}

      <ListeningQuestionRenderer
        question={currentQuestion}
        answer={answers[idx]}
        onChange={(a) => setAnswers((prev) => ({ ...prev, [idx]: a }))}
        revealed={isCurrentRevealed}
      />

      {!isCurrentRevealed && (
        <Button
          onClick={() => setRevealed((prev) => ({ ...prev, [idx]: true }))}
          variant="primary"
          disabled={answers[idx] === undefined}
          className="w-full"
        >
          {t("tasks.checkAnswer")}
        </Button>
      )}

      {isCurrentRevealed && verdict !== null && (
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center gap-2 font-semibold",
            verdict
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
          )}
        >
          <span className="text-xl">{verdict ? "✓" : "✕"}</span>
          <span>{verdict ? t("tasks.correct") : t("tasks.incorrect")}</span>
        </div>
      )}

      {isCurrentRevealed && idx < totalQs - 1 && (
        <Button
          onClick={() => setIdx(idx + 1)}
          variant="secondary"
          className="w-full"
        >
          {t("lessonListening.nextQuestion")}
        </Button>
      )}
    </div>
  );
};

export default QuizListeningCard;
