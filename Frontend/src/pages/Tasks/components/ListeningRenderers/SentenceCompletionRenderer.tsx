import cn from "@/utils/cn";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { ListeningSentenceCompletionQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Renders the question with the `___` slot replaced by an inline
 * input. Falls back to a stand-alone input above the question text
 * when the slot marker isn't present (defensive — the prompt is
 * supposed to include `___` but models occasionally drop it).
 */
const SentenceCompletionRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningSentenceCompletionQuestion>) => {
  const { t } = useTranslation();
  const value = typeof answer === "string" ? answer : "";
  const accepted = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : [question.correctAnswer];
  const isCorrect = accepted.some((a) => norm(a) === norm(value));

  const inputElement = (
    <input
      type="text"
      value={value}
      disabled={revealed}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "px-3 py-1.5 rounded-md border-2 text-base font-medium min-w-[140px] outline-none mx-1",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        revealed && isCorrect
          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
          : revealed
          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
          : "border-indigo-300 focus:border-indigo-500",
      )}
      placeholder={t("tasks.fillBlank", { defaultValue: "answer" })}
    />
  );

  // Replace exactly the first run of three or more underscores. Any
  // surplus underscores (`____`, `___ ___`) collapse into one input —
  // the model is asked for one slot per item.
  const parts = question.question.split(/_{3,}/);
  const hasMarker = parts.length > 1;

  return (
    <div className="space-y-3">
      <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        {hasMarker ? (
          parts.map((piece, i) => (
            <Fragment key={i}>
              {piece}
              {i < parts.length - 1 && inputElement}
            </Fragment>
          ))
        ) : (
          <>
            {question.question}
            <br />
            {inputElement}
          </>
        )}
      </p>
      {revealed && !isCorrect && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
          <span className="font-semibold">
            {t("tasks.acceptedAnswers", { defaultValue: "Accepted:" })}
          </span>{" "}
          {accepted.join(" / ")}
        </div>
      )}
    </div>
  );
};

export default SentenceCompletionRenderer;
