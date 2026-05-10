import cn from "@/utils/cn";
import type { MultiSelectMCQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { useTranslation } from "react-i18next";

const norm = (s: string) => s.trim().toLowerCase();

const MultiSelectRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<MultiSelectMCQuestion>) => {
  const { t } = useTranslation();
  const selected = Array.isArray(answer) ? answer : [];
  const correctSet = new Set(question.correct_answers.map(norm));

  const toggle = (opt: string) => {
    if (revealed) return;
    const normalized = selected.map(norm);
    const next = normalized.includes(norm(opt))
      ? selected.filter((s) => norm(s) !== norm(opt))
      : [...selected, opt];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-semibold">
        {t("tasks.selectAllThatApply", {
          defaultValue: "Select all that apply",
        })}
      </p>
      {question.options.map((opt, i) => {
        const isSelected = selected.some((s) => norm(s) === norm(opt));
        const isCorrect = correctSet.has(norm(opt));
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && isSelected && !isCorrect;
        const showMissed = revealed && !isSelected && isCorrect;

        return (
          <button
            type="button"
            key={i}
            onClick={() => toggle(opt)}
            disabled={revealed}
            aria-pressed={isSelected}
            className={cn(
              "w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left",
              showCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : showWrong
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : showMissed
                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                : isSelected
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-gray-50 dark:bg-gray-800 cursor-pointer",
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded border-2 mr-4 flex items-center justify-center flex-shrink-0",
                showCorrect
                  ? "border-green-500 bg-green-500"
                  : showWrong
                  ? "border-red-500 bg-red-500"
                  : showMissed
                  ? "border-amber-500 bg-amber-500"
                  : isSelected
                  ? "border-violet-500 bg-violet-500"
                  : "border-gray-300 dark:border-gray-600",
              )}
            >
              {(isSelected || showCorrect || showMissed) && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={cn(
                "font-medium flex-1",
                showCorrect
                  ? "text-green-700 dark:text-green-300"
                  : showWrong
                  ? "text-red-700 dark:text-red-300"
                  : showMissed
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-gray-700 dark:text-gray-300",
              )}
            >
              {opt}
            </span>
            {showMissed && (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                {t("tasks.missed", { defaultValue: "Missed" })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MultiSelectRenderer;
