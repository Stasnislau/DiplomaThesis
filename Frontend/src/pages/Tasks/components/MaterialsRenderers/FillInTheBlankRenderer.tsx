import cn from "@/utils/cn";
import type { FillInTheBlankQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { useTranslation } from "react-i18next";

const norm = (s: string) => s.trim().toLowerCase();

const FillInTheBlankRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<FillInTheBlankQuestion>) => {
  const { t } = useTranslation();
  const value = typeof answer === "string" ? answer : "";

  const acceptedAnswers = Array.isArray(question.correct_answer)
    ? question.correct_answer
    : [question.correct_answer];
  const isCorrect = acceptedAnswers.some((a) => norm(a) === norm(value));

  return (
    <div className="space-y-3">
      <input
        type="text"
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          revealed && isCorrect
            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
            : revealed
            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
            : "border-gray-300 dark:border-gray-700 focus:border-violet-500",
        )}
        placeholder={t("tasks.typeAnswer")}
        value={value}
        disabled={revealed}
        onChange={(e) => onChange(e.target.value)}
      />
      {revealed && (
        <div
          className={cn(
            "p-3 rounded-xl text-sm",
            isCorrect
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200",
          )}
        >
          <span className="font-semibold">
            {t("tasks.acceptedAnswers", { defaultValue: "Accepted:" })}
          </span>{" "}
          {acceptedAnswers.join(" / ")}
        </div>
      )}
    </div>
  );
};

export default FillInTheBlankRenderer;
