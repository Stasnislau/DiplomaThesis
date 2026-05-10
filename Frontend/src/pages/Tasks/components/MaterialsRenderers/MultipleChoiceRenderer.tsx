import cn from "@/utils/cn";
import type { MultipleChoiceQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";

const MultipleChoiceRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<MultipleChoiceQuestion>) => {
  const selected = typeof answer === "string" ? answer : "";

  return (
    <div className="space-y-3">
      {question.options.map((opt, i) => {
        const isSelected = selected === opt;
        const isCorrect = opt === question.correct_answer;
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && isSelected && !isCorrect;

        return (
          <div
            key={i}
            onClick={() => !revealed && onChange(opt)}
            className={cn(
              "flex items-center p-4 rounded-xl border-2 transition-all duration-200",
              showCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : showWrong
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : isSelected
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-gray-50 dark:bg-gray-800 cursor-pointer",
            )}
            role="radio"
            aria-checked={isSelected}
            tabIndex={revealed ? -1 : 0}
            onKeyDown={(e) => {
              if (!revealed && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onChange(opt);
              }
            }}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0",
                showCorrect
                  ? "border-green-500 bg-green-500"
                  : showWrong
                  ? "border-red-500 bg-red-500"
                  : isSelected
                  ? "border-violet-500 bg-violet-500"
                  : "border-gray-300 dark:border-gray-600",
              )}
            >
              {(isSelected || showCorrect) && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span
              className={cn(
                "font-medium",
                showCorrect
                  ? "text-green-700 dark:text-green-300"
                  : showWrong
                  ? "text-red-700 dark:text-red-300"
                  : "text-gray-700 dark:text-gray-300",
              )}
            >
              {opt}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default MultipleChoiceRenderer;
