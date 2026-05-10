import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import type { SpeakingGradeResponse } from "@/types/responses/SpeakingResponse";

const ScoreCard = ({
  label,
  value,
  suffix = "/100",
  tone = "indigo",
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  tone?: "indigo" | "emerald" | "rose" | "amber";
}) => {
  if (value === null || value === undefined) return null;
  const toneColor: Record<string, string> = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
        {label}
      </p>
      <div className="flex items-end gap-1">
        <span className={cn("text-2xl font-bold", toneColor[tone])}>
          {Math.round(value)}
        </span>
        <span className="text-xs text-gray-400 mb-1">{suffix}</span>
      </div>
    </div>
  );
};

interface GradeDisplayProps {
  result: SpeakingGradeResponse;
}

const GradeDisplay = ({ result }: GradeDisplayProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Score grid — varies by format. WER/match for repeat_after_me;
          content/coherence/vocab for the LLM-graded ones; fluency
          always present from pronunciation metrics. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreCard
          label={t("speakingResults.fluencyLabel")}
          value={result.pronunciation.fluencyScore}
          tone="indigo"
        />
        <ScoreCard
          label={t("tasks.contentScore", { defaultValue: "Content" })}
          value={result.contentScore}
          tone="emerald"
        />
        <ScoreCard
          label={t("tasks.coherenceScore", { defaultValue: "Coherence" })}
          value={result.coherenceScore}
          tone="amber"
        />
        <ScoreCard
          label={t("tasks.vocabularyScore", { defaultValue: "Vocabulary" })}
          value={result.vocabularyScore}
          tone="indigo"
        />
        <ScoreCard
          label={t("tasks.matchPercent", { defaultValue: "Match" })}
          value={result.matchPercent}
          suffix="%"
          tone={
            result.matchPercent !== null && result.matchPercent !== undefined
              ? result.matchPercent >= 80
                ? "emerald"
                : result.matchPercent >= 60
                ? "amber"
                : "rose"
              : "indigo"
          }
        />
      </div>

      {/* Transcription */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 flex items-center gap-2">
          <span className="text-white">📝</span>
          <h3 className="text-sm font-semibold text-white">
            {t("speakingResults.transcriptionTitle")}
          </h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {result.transcription || "—"}
          </p>
        </div>
      </div>

      {/* Overall assessment */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
        <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
          {t("speakingResults.overallAssessmentTitle")}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {result.overallAssessment}
        </p>
      </div>

      {/* Errors */}
      {result.identifiedErrors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-red-500 px-5 py-3">
            <h3 className="text-sm font-semibold text-white">
              {t("speakingResults.identifiedErrorsTitle")}
            </h3>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {result.identifiedErrors.map((err, i) => (
              <li key={i} className="p-4">
                <p className="text-sm font-mono text-red-600 dark:text-red-400">
                  "{err.erroneousText}"
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {err.explanation}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                  → {err.suggestion}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths / improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.positivePoints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              ✅ {t("speakingResults.positivePointsTitle")}
            </h3>
            <ul className="space-y-2">
              {result.positivePoints.map((p, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 dark:text-gray-400 flex gap-2"
                >
                  <span className="text-emerald-400 shrink-0">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.areasForImprovement.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              📈 {t("speakingResults.areasForImprovementTitle")}
            </h3>
            <ul className="space-y-2">
              {result.areasForImprovement.map((a, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 dark:text-gray-400 flex gap-2"
                >
                  <span className="text-amber-400 shrink-0">•</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeDisplay;
