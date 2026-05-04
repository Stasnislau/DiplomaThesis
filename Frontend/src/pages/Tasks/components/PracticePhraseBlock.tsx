import { useState } from "react";

import { useTranslation } from "react-i18next";

import {
  PracticePhraseResponse,
  getSpeakingPracticePhrase,
} from "@/api/mutations/getSpeakingPracticePhrase";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface Props {
  /** Same `language` value the speaking analyzer uses (lower-case
   *  English label like "english", "polish"). Bridge title-cases it. */
  language: string;
  /** Optional callback so the parent (SpeakingTask) can bind the
   *  recording UI to the phrase the learner just got. */
  onPhraseChosen?: (phrase: string) => void;
}

/**
 * Adaptive practice-phrase widget. Lives at the top of the speaking
 * page. Generates one sentence per click, biased toward the user's
 * recent weaknesses; the user then records themselves reading it
 * aloud through the existing speaking analyzer.
 */
export function PracticePhraseBlock({ language, onPhraseChosen }: Props) {
  const { t } = useTranslation();
  const [level, setLevel] = useState<string>("B1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PracticePhraseResponse | null>(null);

  const handleClick = async () => {
    if (!language) return;
    setLoading(true);
    setError(null);
    try {
      const backendLanguage =
        language.charAt(0).toUpperCase() + language.slice(1);
      const out = await getSpeakingPracticePhrase({
        language: backendLanguage,
        level,
      });
      setData(out);
      onPhraseChosen?.(out.phrase);
    } catch (e) {
      setError(e instanceof Error ? e.message : "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/10 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span role="img" aria-hidden="true">🎯</span>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          {t("speakingPractice.title")}
        </h3>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
        {t("speakingPractice.subtitle")}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setLevel(lvl)}
            className={`text-xs font-bold px-2.5 py-1 rounded ${
              level === lvl
                ? "bg-amber-600 text-white"
                : "bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50"
            }`}
            aria-pressed={level === lvl}
          >
            {lvl}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!language || loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("common.generating") : t("speakingPractice.generate")}
      </button>

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {data && (
        <div className="mt-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data.phrase}
          </p>
          {data.translation && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
              {data.translation}
            </p>
          )}
          {data.focus && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              {t("speakingPractice.focusLabel")}: <span className="font-medium">{data.focus}</span>
            </p>
          )}
          {data.derivedFromHistory && data.targetedWeaknesses.length > 0 && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {t("tasks.targetingFromHistory", {
                focus: data.targetedWeaknesses.slice(0, 3).join(", "),
              })}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t("speakingPractice.hint")}
          </p>
        </div>
      )}
    </div>
  );
}
