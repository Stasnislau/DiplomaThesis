import React, { useEffect, useState } from "react";

import Button from "@/components/common/Button";
import EssayTask from "@/pages/Tasks/components/EssayTask";
import QuizSpeakingCard from "./QuizSpeakingCard";
import { useTranslation } from "react-i18next";
import { logWritingResult } from "@/api/mutations/logWritingResult";
import {
  generateTypedTask,
  type TypedTaskType,
} from "@/api/mutations/generateTypedTask";
import { QuizQuestion } from "@/api/mutations/generateQuiz";
import QuestionRenderer, {
  gradeQuestion,
  type UserAnswerValue,
} from "@/pages/Tasks/components/MaterialsRenderers";
import cn from "@/utils/cn";
import { pickQuizVariant, type QuizVariant } from "./pickTaskType";
import QuizListeningCard from "./QuizListeningCard";

const LANGUAGES = [
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "English", flag: "🇬🇧" },
  { code: "Italian", flag: "🇮🇹" },
];

export const TaskPage: React.FC = () => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  // Per-question user answer. UserAnswerValue spans every shape the
  // 7 Materials variants need (string | string[] | Record<id,value>).
  const [userAnswer, setUserAnswer] = useState<UserAnswerValue | undefined>(
    undefined,
  );
  const [revealed, setRevealed] = useState(false);
  // The variant the picker rolled for the current generation. Drives
  // which renderer mounts: writing → QuestionRenderer; listening →
  // QuizListeningCard; speaking → FormatPracticePanel; essay (subset
  // of writing) → EssayTask.
  const [activeVariant, setActiveVariant] = useState<QuizVariant | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every Generate Task click so the listening / speaking
  // sub-widgets force-remount and refetch.
  const [genCounter, setGenCounter] = useState(0);

  useEffect(() => {
    if (language || level) {
      setCurrentQuestion(null);
      setActiveVariant(null);
      setUserAnswer(undefined);
      setRevealed(false);
      setError(null);
    }
  }, [language, level]);

  const handleCreateTask = async () => {
    if (!language || !level) return;
    setError(null);
    setUserAnswer(undefined);
    setRevealed(false);
    setCurrentQuestion(null);
    setGenCounter((c) => c + 1);

    const variant = pickQuizVariant(level);
    setActiveVariant(variant);

    if (variant.kind === "writing") {
      if (variant.type === "essay") {
        // Essay flow is fully self-contained inside <EssayTask />.
        // No typed-task fetch — the inner component generates its
        // own prompt and grades it via /writing/essay/evaluate.
        return;
      }
      setIsLoading(true);
      try {
        const q = await generateTypedTask({
          language,
          level,
          taskType: variant.type as TypedTaskType,
        });
        setCurrentQuestion(q);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("tasks.analysisFailed"));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Listening / speaking sub-widgets manage their own fetch +
    // recording + grading lifecycle. We just mount them by setting
    // activeVariant; each panel picks up the new genCounter and
    // refetches.
  };

  const handleCheckAnswer = () => {
    if (!currentQuestion || userAnswer === undefined) return;
    setRevealed(true);
    const verdict = gradeQuestion(currentQuestion, userAnswer);
    if (language && level && verdict !== null) {
      logWritingResult({
        language,
        level,
        flavour:
          currentQuestion.type === "multiple_choice"
            ? "multiple_choice"
            : "fill_in_the_blank",
        isCorrect: verdict,
        targetedWeaknesses: [],
        questionPreview: currentQuestion.question?.slice(0, 160),
      }).catch((err) => {
        console.warn("logWritingResult failed:", err);
      });
    }
  };

  const verdict =
    revealed && currentQuestion
      ? gradeQuestion(currentQuestion, userAnswer)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 flex flex-col justify-center sm:py-12 transition-colors duration-300">
      <div className="relative py-3 sm:max-w-2xl sm:mx-auto w-full px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl transition-all duration-300 hover:-rotate-3 opacity-70" />

        <div className="relative px-4 py-10 bg-white dark:bg-gray-800 shadow-xl sm:rounded-3xl sm:p-20 transition-colors duration-300">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="pb-8 text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">
                  {t("nav.languageLearning", {
                    defaultValue: "Language Learning",
                  })}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t("languages.chooseLanguage")} & {t("languages.proficiencyLevel")}
                </p>
              </div>

              <div className="py-8 space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {t("languages.chooseLanguage")}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={cn(
                          "py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                          language === lang.code
                            ? "bg-indigo-600 text-white shadow-md scale-105"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                        )}
                        aria-pressed={language === lang.code}
                      >
                        <span className="text-lg" role="img" aria-hidden="true">
                          {lang.flag}
                        </span>
                        <span>
                          {t(`languages.${lang.code.toLowerCase()}`) || lang.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {t("languages.proficiencyLevel")}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={cn(
                          "py-2 px-1 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500",
                          level === lvl
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                        )}
                        aria-pressed={level === lvl}
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
                  className="w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("tasks.generateTask")}
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t("common.error")}: {error}
                </p>
              </div>
            )}

            {/* WRITING — essay sub-flow */}
            {activeVariant?.kind === "writing" &&
              activeVariant.type === "essay" &&
              language &&
              level && (
                <div className="mt-8">
                  <EssayTask
                    key={`essay-${language}-${level}-${genCounter}`}
                    language={language}
                    level={level}
                  />
                </div>
              )}

            {/* WRITING — MC / FIB / T-F / multi-select / matching / cloze / open */}
            {activeVariant?.kind === "writing" &&
              activeVariant.type !== "essay" &&
              currentQuestion && (
                <div className="mt-8 space-y-4">
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10 p-4">
                    <span className="inline-block text-[11px] uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                      ✍️ {t(`tasks.questionType.${currentQuestion.type}`, {
                        defaultValue: currentQuestion.type,
                      })}
                    </span>
                    {currentQuestion.context_text &&
                      currentQuestion.type !== "cloze_passage" && (
                        <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line max-h-72 overflow-y-auto">
                          {currentQuestion.context_text}
                        </div>
                      )}
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {currentQuestion.question}
                    </p>
                  </div>

                  <QuestionRenderer
                    question={currentQuestion}
                    answer={userAnswer}
                    onChange={setUserAnswer}
                    revealed={revealed}
                  />

                  <Button
                    onClick={handleCheckAnswer}
                    disabled={revealed || userAnswer === undefined}
                    variant="primary"
                    className="w-full justify-center"
                  >
                    {t("tasks.checkAnswer")}
                  </Button>

                  {revealed && verdict !== null && (
                    <div
                      className={cn(
                        "p-4 rounded-xl border flex items-center gap-2 font-semibold",
                        verdict
                          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
                      )}
                    >
                      <span className="text-xl">{verdict ? "✓" : "✕"}</span>
                      <span>
                        {verdict ? t("tasks.correct") : t("tasks.incorrect")}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* LISTENING — audio + question with adaptive history-logging */}
            {activeVariant?.kind === "listening" && language && level && (
              <div className="mt-8">
                <QuizListeningCard
                  key={`listen-${language}-${level}-${genCounter}`}
                  language={language}
                  level={level}
                  questionType={activeVariant.questionType}
                />
              </div>
            )}

            {/* SPEAKING — single rolled format, auto-loads, no second click */}
            {activeVariant?.kind === "speaking" && language && level && (
              <div className="mt-8">
                <QuizSpeakingCard
                  key={`speak-${language}-${level}-${activeVariant.format}-${genCounter}`}
                  language={language}
                  level={level}
                  format={activeVariant.format}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
