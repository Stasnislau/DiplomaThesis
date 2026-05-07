import { useEffect, useMemo, useState } from "react";

import Button from "@/components/common/Button";
import { EssayEvaluation } from "@/api/mutations/evaluateEssay";
import { useEvaluateEssay, useGenerateEssay } from "@/api/hooks/useEssay";
import { useTranslation } from "react-i18next";

interface EssayTaskProps {
  language: string;
  level: string;
  /** Lesson topic / theme hint passed to the AI generator. Optional. */
  topic?: string;
  keywords?: string[];
  /** Foreign-key into TaskHistoryEntry so the back-end can attribute
   *  the result to a specific lesson (used by learning-path
   *  completion). Free-practice doesn't pass it. */
  lessonId?: string;
  /** Called once with the score so the parent (lesson page) can mark
   *  the lesson complete on a passing grade. */
  onEvaluated?: (evaluation: EssayEvaluation) => void;
}

const wordCount = (s: string): number =>
  s.trim().length === 0 ? 0 : s.trim().split(/\s+/).length;

const EssayTask = ({
  language,
  level,
  topic,
  keywords,
  lessonId,
  onEvaluated,
}: EssayTaskProps) => {
  const { t } = useTranslation();

  const {
    generate,
    isLoading: isLoadingPrompt,
    data: prompt,
    error: promptError,
    reset: resetPrompt,
  } = useGenerateEssay();
  const {
    evaluate,
    isLoading: isEvaluating,
    data: evaluation,
    error: evalError,
    reset: resetEval,
  } = useEvaluateEssay();

  const [essay, setEssay] = useState("");

  // Auto-generate the prompt on mount + when language/level/topic
  // change. Without this the user lands on a blank screen and has to
  // hunt for a button.
  useEffect(() => {
    if (!language || !level) return;
    setEssay("");
    resetEval();
    generate({ language, level, topic, keywords });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level, topic]);

  // Bubble the evaluation up so the parent can act on a pass.
  useEffect(() => {
    if (evaluation) onEvaluated?.(evaluation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation]);

  const wc = useMemo(() => wordCount(essay), [essay]);
  const target = prompt?.wordCountTarget ?? 250;
  const minToSubmit = Math.max(50, Math.floor(target * 0.4));
  const canSubmit = !isEvaluating && wc >= minToSubmit && !!prompt;

  const handleSubmit = () => {
    if (!prompt || !canSubmit) return;
    evaluate({
      language,
      level,
      topic: prompt.topic,
      essay,
      wordCountTarget: prompt.wordCountTarget,
      lessonId,
    });
  };

  const handleNewPrompt = () => {
    resetPrompt();
    resetEval();
    setEssay("");
    generate({ language, level, topic, keywords });
  };

  if (isLoadingPrompt && !prompt) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-300">
          {t("essay.generatingPrompt")}
        </p>
      </div>
    );
  }

  if (promptError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <p className="text-red-700 dark:text-red-300">
          {promptError.message}
        </p>
        <Button onClick={handleNewPrompt} className="mt-3">
          {t("essay.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prompt panel */}
      {prompt && !evaluation && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="inline-block bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs px-2 py-1 rounded-full mb-2">
                ✍️ {t("essay.label")}
              </span>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {prompt.topic}
              </p>
            </div>
            <button
              onClick={handleNewPrompt}
              className="text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400"
              title={t("essay.newPrompt")}
            >
              ↻
            </button>
          </div>

          {prompt.instructions?.length > 0 && (
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4 list-disc list-inside">
              {prompt.instructions.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}

          {prompt.rubricHints?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {prompt.rubricHints.map((hint, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
                >
                  {hint}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            {t("essay.targetWords", { count: prompt.wordCountTarget })}
          </p>
        </div>
      )}

      {/* Editor */}
      {prompt && !evaluation && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            disabled={isEvaluating}
            placeholder={t("essay.placeholder")}
            rows={14}
            className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
          />
          <div className="flex items-center justify-between mt-3 text-sm">
            <span
              className={
                wc >= minToSubmit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {t("essay.wordCount", { count: wc, target })}
            </span>
            <Button
              onClick={handleSubmit}
              isLoading={isEvaluating}
              disabled={!canSubmit}
            >
              {isEvaluating ? t("essay.evaluating") : t("essay.submit")}
            </Button>
          </div>
          {evalError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {evalError.message}
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {evaluation && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
          <div className="flex items-center gap-5">
            <ScoreCircle score={evaluation.score} />
            <div className="flex-1">
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full mb-2 ${
                  evaluation.passed
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                }`}
              >
                {evaluation.passed ? t("essay.passed") : t("essay.notPassed")}
              </span>
              <p className="text-gray-800 dark:text-gray-100">
                {evaluation.summary}
              </p>
            </div>
          </div>

          {evaluation.strengths?.length > 0 && (
            <FeedbackList
              title={t("essay.strengths")}
              items={evaluation.strengths}
              colorClass="text-emerald-600 dark:text-emerald-400"
            />
          )}
          {evaluation.weaknesses?.length > 0 && (
            <FeedbackList
              title={t("essay.weaknesses")}
              items={evaluation.weaknesses}
              colorClass="text-rose-600 dark:text-rose-400"
            />
          )}
          {evaluation.suggestions?.length > 0 && (
            <FeedbackList
              title={t("essay.suggestions")}
              items={evaluation.suggestions}
              colorClass="text-violet-600 dark:text-violet-400"
            />
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleNewPrompt}>{t("essay.tryAnother")}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreCircle = ({ score }: { score: number }) => {
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div
      className={`w-20 h-20 flex items-center justify-center rounded-full border-4 border-current ${color}`}
    >
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
    </div>
  );
};

const FeedbackList = ({
  title,
  items,
  colorClass,
}: {
  title: string;
  items: string[];
  colorClass: string;
}) => (
  <div>
    <h4 className={`font-semibold mb-2 ${colorClass}`}>{title}</h4>
    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  </div>
);

export default EssayTask;
