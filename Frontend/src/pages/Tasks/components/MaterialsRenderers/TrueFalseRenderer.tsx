import cn from "@/utils/cn";
import type { TrueFalseQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { useTranslation } from "react-i18next";

const TrueFalseRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<TrueFalseQuestion>) => {
  const { t } = useTranslation();
  const selected = typeof answer === "string" ? answer : "";

  const renderButton = (value: "true" | "false") => {
    const isSelected = selected === value;
    const isCorrect = value === question.correct_answer;
    const showCorrect = revealed && isCorrect;
    const showWrong = revealed && isSelected && !isCorrect;

    return (
      <button
        type="button"
        onClick={() => !revealed && onChange(value)}
        disabled={revealed}
        aria-pressed={isSelected}
        className={cn(
          "flex-1 py-6 rounded-2xl border-2 font-bold text-lg transition-all duration-200",
          "flex items-center justify-center gap-3",
          showCorrect
            ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            : showWrong
            ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            : isSelected
            ? value === "true"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
            : value === "true"
            ? "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800"
            : "border-rose-200 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-700 dark:text-rose-400 bg-white dark:bg-gray-800",
        )}
      >
        <span className="text-2xl">{value === "true" ? "✓" : "✕"}</span>
        <span>
          {value === "true"
            ? t("tasks.true", { defaultValue: "True" })
            : t("tasks.false", { defaultValue: "False" })}
        </span>
      </button>
    );
  };

  return (
    <div className="flex gap-4">
      {renderButton("true")}
      {renderButton("false")}
    </div>
  );
};

export default TrueFalseRenderer;
