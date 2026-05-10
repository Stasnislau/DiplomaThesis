import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import type { ListeningTrueFalseNotGivenQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

type TFNGValue = "true" | "false" | "not_given";

const TrueFalseNotGivenRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningTrueFalseNotGivenQuestion>) => {
  const { t } = useTranslation();
  const selected = typeof answer === "string" ? (answer as TFNGValue) : "";

  const buttons: { value: TFNGValue; labelKey: string; defaultLabel: string; symbol: string; color: string }[] = [
    {
      value: "true",
      labelKey: "tasks.true",
      defaultLabel: "True",
      symbol: "✓",
      color: "emerald",
    },
    {
      value: "false",
      labelKey: "tasks.false",
      defaultLabel: "False",
      symbol: "✕",
      color: "rose",
    },
    {
      value: "not_given",
      labelKey: "tasks.notGiven",
      defaultLabel: "Not Given",
      symbol: "?",
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {buttons.map(({ value, labelKey, defaultLabel, symbol, color }) => {
        const isSelected = selected === value;
        const isCorrect = value === question.correctAnswer;
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && isSelected && !isCorrect;

        // Tailwind doesn't pick up dynamic colour names from string
        // interpolation, so we map the trio explicitly.
        const palette: Record<string, { idle: string; selected: string }> = {
          emerald: {
            idle: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700 bg-white dark:bg-gray-800 dark:text-emerald-400",
            selected: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
          },
          rose: {
            idle: "border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-700 bg-white dark:bg-gray-800 dark:text-rose-400",
            selected: "border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
          },
          amber: {
            idle: "border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-700 bg-white dark:bg-gray-800 dark:text-amber-400",
            selected: "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
          },
        };

        return (
          <button
            type="button"
            key={value}
            onClick={() => !revealed && onChange(value)}
            disabled={revealed}
            aria-pressed={isSelected}
            className={cn(
              "py-5 rounded-2xl border-2 font-bold text-base transition-all flex flex-col items-center gap-1",
              showCorrect
                ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : showWrong
                ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                : isSelected
                ? palette[color].selected
                : palette[color].idle,
            )}
          >
            <span className="text-xl">{symbol}</span>
            <span className="text-sm">{t(labelKey, { defaultValue: defaultLabel })}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TrueFalseNotGivenRenderer;
