import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import { useCreateListeningTask } from "@/api/hooks/useCreateListeningTask";
import { ListeningTaskResponse } from "@/types/responses/TaskResponse";
import {
  LISTENING_QUESTION_TYPES,
  type ListeningQuestionType,
} from "@/types/responses/ListeningResponse";
import { useTranslation } from "react-i18next";
import { generateAdaptiveListeningTask } from "@/api/mutations/generateAdaptiveListeningTask";
import ListeningQuestionRenderer, {
  gradeListeningQuestion,
  type ListeningAnswerValue,
} from "./ListeningRenderers";
import cn from "@/utils/cn";

const LANGUAGES = [
  { code: "English", flag: "🇬🇧" },
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "Italian", flag: "🇮🇹" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Default selection on first mount — historic behaviour.
const DEFAULT_SELECTED_TYPES: ListeningQuestionType[] = [
  "multiple_choice",
  "fill_in_the_blank",
];

const QUESTION_TYPE_LABELS: Record<ListeningQuestionType, { defaultLabel: string; emoji: string }> = {
  multiple_choice: { defaultLabel: "Multiple choice", emoji: "🔘" },
  fill_in_the_blank: { defaultLabel: "Fill in the blank", emoji: "✍️" },
  dictation: { defaultLabel: "Dictation", emoji: "📝" },
  true_false_not_given: { defaultLabel: "True / False / Not Given", emoji: "⚖️" },
  sentence_completion: { defaultLabel: "Sentence completion", emoji: "🧩" },
  multi_speaker_matching: { defaultLabel: "Match speakers", emoji: "🗣️" },
};

const ListeningTask = () => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ListeningQuestionType[]>(
    DEFAULT_SELECTED_TYPES,
  );
  const [currentTaskData, setCurrentTaskData] = useState<ListeningTaskResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Per-question answers — shape varies by question type, the
  // dispatcher and grader interpret each entry.
  const [userAnswers, setUserAnswers] = useState<Record<number, ListeningAnswerValue>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  const { createListeningTask, isLoading, error, data, reset } = useCreateListeningTask();
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const [adaptiveTargets, setAdaptiveTargets] = useState<string[]>([]);
  const [adaptiveError, setAdaptiveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setCurrentTaskData(data);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setRevealed({});
      setShowTranscript(false);
    }
  }, [data]);

  const toggleType = (type: ListeningQuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleCreateTask = () => {
    if (language && level && selectedTypes.length > 0) {
      reset();
      setCurrentTaskData(null);
      setAdaptiveTargets([]);
      createListeningTask({
        language,
        level,
        questionTypes: selectedTypes,
      });
    } else {
      alert(t("tasks.selectLanguageAndLevel"));
    }
  };

  const handleAnswerChange = (idx: number, ans: ListeningAnswerValue) => {
    setUserAnswers((prev) => ({ ...prev, [idx]: ans }));
  };

  const toggleRevealed = (idx: number) => {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const currentQuestion = currentTaskData?.questions[currentQuestionIndex];
  const isCurrentRevealed = !!revealed[currentQuestionIndex];
  const currentVerdict =
    isCurrentRevealed && currentQuestion
      ? gradeListeningQuestion(currentQuestion, userAnswers[currentQuestionIndex])
      : null;

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-lg">🌍</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("languages.chooseLanguage")}
          </label>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex-1 min-w-[90px] py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-1 ${
                language === lang.code
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "bg-white dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:border-indigo-200 dark:hover:border-gray-600"
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-xs">{lang.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("languages.proficiencyLevel")}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`flex-1 min-w-[60px] py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                level === lvl
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700 hover:text-purple-700 dark:hover:text-purple-300"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Question type selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <span className="text-lg">🎯</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("tasks.questionTypes", { defaultValue: "Question types" })}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {LISTENING_QUESTION_TYPES.map((typ) => {
            const isOn = selectedTypes.includes(typ);
            const meta = QUESTION_TYPE_LABELS[typ];
            return (
              <button
                key={typ}
                type="button"
                onClick={() => toggleType(typ)}
                aria-pressed={isOn}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all flex items-center gap-1.5",
                  isOn
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-violet-300",
                )}
              >
                <span>{meta.emoji}</span>
                <span>{t(`tasks.questionType.${typ}`, { defaultValue: meta.defaultLabel })}</span>
              </button>
            );
          })}
        </div>
        {selectedTypes.length === 0 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            {t("tasks.pickAtLeastOneType", {
              defaultValue: "Pick at least one question type.",
            })}
          </p>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleCreateTask}
        disabled={!language || !level || selectedTypes.length === 0 || isLoading || adaptiveLoading}
        variant="primary"
        isLoading={isLoading}
        className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
      >
        {isLoading ? t("common.generating") : t("tasks.generateListeningTask")}
      </Button>

      {/* Adaptive */}
      <button
        type="button"
        onClick={async () => {
          if (!language || !level) return;
          setAdaptiveError(null);
          setAdaptiveLoading(true);
          reset();
          setCurrentTaskData(null);
          setAdaptiveTargets([]);
          try {
            const out = await generateAdaptiveListeningTask({ language, level });
            setCurrentTaskData(out.task);
            setCurrentQuestionIndex(0);
            setUserAnswers({});
            setRevealed({});
            setShowTranscript(false);
            setAdaptiveTargets(out.derivedFromHistory ? out.targetedWeaknesses : []);
          } catch (e) {
            setAdaptiveError(e instanceof Error ? e.message : "");
          } finally {
            setAdaptiveLoading(false);
          }
        }}
        disabled={!language || !level || isLoading || adaptiveLoading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span role="img" aria-hidden="true">🎯</span>
        {adaptiveLoading
          ? t("common.generating")
          : t("tasks.practiceWeakSpots")}
      </button>
      {adaptiveTargets.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t("tasks.targetingFromHistory", {
            focus: adaptiveTargets.slice(0, 3).join(", "),
          })}
        </p>
      )}
      {adaptiveError && (
        <p className="text-xs text-red-600 dark:text-red-400">{adaptiveError}</p>
      )}

      {error && error.message && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <p className="text-sm text-red-600 font-medium">{error.message}</p>
          </div>
        </div>
      )}

      {currentTaskData && (
        <div className="space-y-4">
          {/* Audio Player */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🎧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("tasks.listeningTask")}</h2>
                <p className="text-indigo-100 text-sm">{t("tasks.listenCarefully")}</p>
              </div>
            </div>
            <audio src={currentTaskData.audioUrl} controls className="w-full rounded-xl" />
            {currentTaskData.speakers && currentTaskData.speakers.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {currentTaskData.speakers.map((sp) => (
                  <span
                    key={sp}
                    className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold"
                  >
                    🗣️ {sp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Transcript Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between py-2 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                  <span className="text-lg">📜</span>
                </div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {showTranscript ? t("tasks.hideTranscript") : t("tasks.showTranscript")}
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
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{currentTaskData.transcript}</p>
              </div>
            )}
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold">{currentQuestionIndex + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">
                      {t("tasks.questionLabel", { defaultValue: "Question" })} {currentQuestionIndex + 1}
                    </h3>
                    <p className="text-xs text-gray-500">
                      of {currentTaskData.questions.length} questions
                    </p>
                  </div>
                </div>

                {/* Per-question type chip */}
                <span className="text-xs font-medium text-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1 rounded-full">
                  {t(`tasks.questionType.${currentQuestion.type}`, {
                    defaultValue: QUESTION_TYPE_LABELS[currentQuestion.type].defaultLabel,
                  })}
                </span>
              </div>

              {/* Question prompt — for sentence_completion the renderer
                  itself shows the question text with inline blank,
                  so suppress the duplicate here. */}
              {currentQuestion.type !== "sentence_completion" && (
                <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-5">
                  {currentQuestion.question}
                </p>
              )}

              <ListeningQuestionRenderer
                question={currentQuestion}
                answer={userAnswers[currentQuestionIndex]}
                onChange={(a) => handleAnswerChange(currentQuestionIndex, a)}
                revealed={isCurrentRevealed}
              />

              <button
                onClick={() => toggleRevealed(currentQuestionIndex)}
                className={cn(
                  "mt-5 flex items-center gap-2 text-sm font-medium transition-colors",
                  isCurrentRevealed ? "text-gray-500" : "text-indigo-600 hover:text-indigo-700",
                )}
              >
                {isCurrentRevealed
                  ? t("tasks.hideAnswer", { defaultValue: "Hide Answer" })
                  : t("tasks.checkAnswer", { defaultValue: "Check Answer" })}
              </button>

              {isCurrentRevealed && currentVerdict !== null && (
                <div
                  className={cn(
                    "mt-3 p-4 rounded-xl border flex items-center gap-2 font-semibold",
                    currentVerdict
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
                  )}
                >
                  <span className="text-xl">{currentVerdict ? "✓" : "✕"}</span>
                  <span>
                    {currentVerdict
                      ? t("tasks.correct", { defaultValue: "Correct" })
                      : t("tasks.incorrect", { defaultValue: "Incorrect" })}
                  </span>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  variant="secondary"
                  className="h-10 px-6 rounded-xl"
                >
                  ← {t("common.previous")}
                </Button>
                <Button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(currentTaskData.questions.length - 1, prev + 1),
                    )
                  }
                  disabled={currentQuestionIndex === currentTaskData.questions.length - 1}
                  variant="primary"
                  className="h-10 px-6 rounded-xl"
                >
                  {t("common.next")} →
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
