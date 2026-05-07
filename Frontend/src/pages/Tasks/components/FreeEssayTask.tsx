import { useEffect, useState } from "react";

import EssayTask from "./EssayTask";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "spanish", flag: "🇪🇸" },
  { code: "french", flag: "🇫🇷" },
  { code: "german", flag: "🇩🇪" },
  { code: "russian", flag: "🇷🇺" },
  { code: "polish", flag: "🇵🇱" },
  { code: "english", flag: "🇬🇧" },
  { code: "italian", flag: "🇮🇹" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface FreeEssayTaskProps {
  initialLanguage?: string;
  initialLevel?: string;
}

const FreeEssayTask = ({
  initialLanguage,
  initialLevel,
}: FreeEssayTaskProps) => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState(initialLanguage || "");
  const [level, setLevel] = useState(initialLevel || "");
  // Force a remount of the inner EssayTask when the user picks a new
  // language or level — without this, the inner state holds onto the
  // stale generated prompt.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (initialLanguage) setLanguage(initialLanguage);
    if (initialLevel) setLevel(initialLevel);
  }, [initialLanguage, initialLevel]);

  const ready = !!language && !!level;

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
              {t("tasks.languageLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(({ code, flag }) => (
                <button
                  key={code}
                  onClick={() => {
                    setLanguage(code);
                    setResetKey((k) => k + 1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    language === code
                      ? "bg-violet-600 text-white shadow"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-violet-400"
                  }`}
                >
                  <span className="mr-1.5">{flag}</span>
                  {t(`languages.${code}`, { defaultValue: code })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
              {t("tasks.levelLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => {
                    setLevel(lv);
                    setResetKey((k) => k + 1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    level === lv
                      ? "bg-violet-600 text-white shadow"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-violet-400"
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ready ? (
        <EssayTask key={resetKey} language={language} level={level} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-4xl mb-3">✍️</p>
          <p className="text-gray-600 dark:text-gray-300">
            {t("essay.pickLanguageLevel")}
          </p>
        </div>
      )}
    </div>
  );
};

export default FreeEssayTask;
