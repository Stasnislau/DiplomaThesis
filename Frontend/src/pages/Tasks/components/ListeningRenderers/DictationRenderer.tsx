import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import type { ListeningDictationQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

const stripPunct = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const DictationRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningDictationQuestion>) => {
  const { t } = useTranslation();
  const value = typeof answer === "string" ? answer : "";
  const isCorrect = stripPunct(value) === stripPunct(question.correctAnswer);

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-semibold">
        {t("tasks.dictationHint", {
          defaultValue: "Type the sentence exactly as you heard it.",
        })}
      </p>
      <textarea
        rows={3}
        className={cn(
          "w-full px-4 py-3 rounded-xl border-2 outline-none transition-all duration-200 resize-none",
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
          <span className="font-semibold">
            {t("tasks.expected", { defaultValue: "Expected:" })}
          </span>{" "}
          {question.correctAnswer}
        </div>
      )}
    </div>
  );
};

export default DictationRenderer;
