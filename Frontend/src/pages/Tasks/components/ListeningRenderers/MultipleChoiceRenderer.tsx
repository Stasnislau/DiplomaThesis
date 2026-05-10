import cn from "@/utils/cn";
import type { ListeningMultipleChoiceQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

const MultipleChoiceRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningMultipleChoiceQuestion>) => {
  const selected = typeof answer === "string" ? answer : "";

  return (
    <div className="space-y-3">
      {question.options.map((opt, i) => {
        const isSelected = selected === opt;
        const isCorrect = opt === question.correctAnswer;
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && isSelected && !isCorrect;

        return (
          <button
            type="button"
            key={i}
            onClick={() => !revealed && onChange(opt)}
            disabled={revealed}
            aria-pressed={isSelected}
            className={cn(
              "w-full text-left flex items-center p-4 rounded-xl border-2 transition-all duration-200",
              showCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : showWrong
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : isSelected
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-gray-50 dark:bg-gray-800 cursor-pointer",
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0",
                showCorrect
                  ? "border-green-500 bg-green-500"
                  : showWrong
                  ? "border-red-500 bg-red-500"
                  : isSelected
                  ? "border-indigo-500 bg-indigo-500"
                  : "border-gray-300 dark:border-gray-600",
              )}
            >
              {(isSelected || showCorrect) && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{opt}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MultipleChoiceRenderer;
