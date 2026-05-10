import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import type { ListeningFillInTheBlankQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

const FillInTheBlankRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningFillInTheBlankQuestion>) => {
  const { t } = useTranslation();
  const value = typeof answer === "string" ? answer : "";
  const isCorrect = norm(value) === norm(question.correctAnswer);

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
            : "border-gray-300 dark:border-gray-700 focus:border-indigo-500",
        )}
        placeholder={t("tasks.typeAnswer")}
        value={value}
        disabled={revealed}
        onChange={(e) => onChange(e.target.value)}
      />
      {revealed && !isCorrect && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
          <span className="font-semibold">{t("tasks.acceptedAnswers", { defaultValue: "Accepted:" })}</span>{" "}
          {question.correctAnswer}
        </div>
      )}
    </div>
  );
};

export default FillInTheBlankRenderer;
