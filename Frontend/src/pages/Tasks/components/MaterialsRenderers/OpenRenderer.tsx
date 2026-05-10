import type { OpenQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { useTranslation } from "react-i18next";

const OpenRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<OpenQuestion>) => {
  const { t } = useTranslation();
  const value = typeof answer === "string" ? answer : "";

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <textarea
          className="w-full bg-transparent resize-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400 disabled:opacity-60"
          rows={3}
          placeholder={t("tasks.typeAnswer")}
          value={value}
          disabled={revealed}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {revealed && question.correct_answer && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
            {t("tasks.referenceAnswer", { defaultValue: "Reference answer" })}
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-200">
            {question.correct_answer}
          </p>
        </div>
      )}
    </div>
  );
};

export default OpenRenderer;
