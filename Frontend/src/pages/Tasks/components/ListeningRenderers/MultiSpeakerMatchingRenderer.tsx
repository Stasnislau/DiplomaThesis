import cn from "@/utils/cn";
import { useTranslation } from "react-i18next";
import type { ListeningMultiSpeakerMatchingQuestion } from "@/types/responses/ListeningResponse";
import type { ListeningRendererProps } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Lists each statement as a row with a row-of-buttons speaker
 * picker. We use buttons rather than a native <select> because the
 * speaker count is small (2-3) and chips are easier to scan while
 * the audio plays.
 */
const MultiSpeakerMatchingRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: ListeningRendererProps<ListeningMultiSpeakerMatchingQuestion>) => {
  const { t } = useTranslation();
  const map: Record<string, string> =
    answer && typeof answer === "object" ? (answer as Record<string, string>) : {};

  const setPick = (idx: number, speaker: string) => {
    if (revealed) return;
    onChange({ ...map, [String(idx)]: speaker });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-semibold">
        {t("tasks.attributeStatements", {
          defaultValue: "Tap the speaker who said each statement.",
        })}
      </p>
      {question.statements.map((s, idx) => {
        const picked = map[String(idx)] ?? "";
        const verdict = revealed && norm(picked) === norm(s.correctSpeaker);
        const wrong = revealed && picked && !verdict;
        return (
          <div
            key={idx}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              verdict
                ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                : wrong
                ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
            )}
          >
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
              <span className="font-semibold">{idx + 1}.</span> {s.statement}
            </p>
            <div className="flex flex-wrap gap-2">
              {question.speakers.map((sp) => {
                const isPicked = picked === sp;
                const isCanonical = norm(sp) === norm(s.correctSpeaker);
                const showCorrect = revealed && isCanonical;
                const showWrong = revealed && isPicked && !isCanonical;
                return (
                  <button
                    type="button"
                    key={sp}
                    onClick={() => setPick(idx, sp)}
                    disabled={revealed}
                    aria-pressed={isPicked}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                      showCorrect
                        ? "border-green-500 bg-green-500 text-white"
                        : showWrong
                        ? "border-red-500 bg-red-500 text-white"
                        : isPicked
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer",
                    )}
                  >
                    {sp}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MultiSpeakerMatchingRenderer;
