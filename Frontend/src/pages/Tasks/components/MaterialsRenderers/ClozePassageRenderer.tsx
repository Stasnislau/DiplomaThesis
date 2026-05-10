import cn from "@/utils/cn";
import type { ClozePassageQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Renders a connected passage with inline blanks. Backend uses
 * `{{1}} {{2}} ...` markers in `passage_with_blanks`; we split on
 * those and intersperse <input>s with the blank's `id`.
 *
 * If the passage has fewer markers than `blanks` declares, leftover
 * blanks get rendered after the passage so the user can still see
 * and answer them. The reverse (more markers than blanks) is treated
 * by ignoring the extra markers — the AI prompt forbids this but we
 * stay defensive.
 */
const MARKER_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

const ClozePassageRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<ClozePassageQuestion>) => {
  const { t } = useTranslation();
  const userBlanks: Record<string, string> =
    answer && typeof answer === "object" && !Array.isArray(answer)
      ? (answer as Record<string, string>)
      : {};

  // Pre-compute the segments split between markers, plus the matched
  // blank ids in order. Memoised because tokenising on every keystroke
  // would be wasteful.
  const segments = useMemo(() => {
    const parts: Array<{ kind: "text"; value: string } | { kind: "blank"; id: string }> = [];
    let lastIndex = 0;
    const re = new RegExp(MARKER_RE);
    let match: RegExpExecArray | null;
    while ((match = re.exec(question.passage_with_blanks)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          kind: "text",
          value: question.passage_with_blanks.slice(lastIndex, match.index),
        });
      }
      parts.push({ kind: "blank", id: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < question.passage_with_blanks.length) {
      parts.push({
        kind: "text",
        value: question.passage_with_blanks.slice(lastIndex),
      });
    }
    return parts;
  }, [question.passage_with_blanks]);

  const declaredBlankIds = new Set(question.blanks.map((b) => b.id));
  const renderedBlankIds = new Set(
    segments.filter((s): s is { kind: "blank"; id: string } => s.kind === "blank").map((s) => s.id),
  );
  const orphanBlanks = question.blanks.filter((b) => !renderedBlankIds.has(b.id));

  const setBlank = (id: string, value: string) => {
    if (revealed) return;
    onChange({ ...userBlanks, [id]: value });
  };

  const renderBlankInput = (id: string) => {
    const value = userBlanks[id] ?? "";
    const blank = question.blanks.find((b) => b.id === id);
    const accepted = blank
      ? Array.isArray(blank.correct_answer)
        ? blank.correct_answer
        : [blank.correct_answer]
      : [];
    const isCorrect = accepted.some((a) => norm(a) === norm(value));

    return (
      <span className="inline-flex flex-col items-stretch align-baseline mx-1">
        <input
          type="text"
          value={value}
          disabled={revealed}
          onChange={(e) => setBlank(id, e.target.value)}
          className={cn(
            "px-2 py-1 rounded-md border-2 text-base font-medium min-w-[100px] outline-none",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            revealed && isCorrect
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : revealed
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : "border-violet-300 focus:border-violet-500",
          )}
          placeholder={`#${id}`}
        />
        {revealed && !isCorrect && (
          <span className="text-xs text-red-700 dark:text-red-300 mt-1 italic">
            {accepted.join(" / ")}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-semibold">
        {t("tasks.fillEachBlank", {
          defaultValue: "Fill in each blank.",
        })}
      </p>
      <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 leading-relaxed text-gray-800 dark:text-gray-100">
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <Fragment key={i}>{seg.value}</Fragment>
          ) : declaredBlankIds.has(seg.id) ? (
            <Fragment key={i}>{renderBlankInput(seg.id)}</Fragment>
          ) : (
            // Marker the prompt produced but didn't declare in `blanks`.
            // Render it as plain text so the passage stays readable
            // instead of dropping content silently.
            <Fragment key={i}>{`{{${seg.id}}}`}</Fragment>
          ),
        )}
      </div>
      {orphanBlanks.length > 0 && (
        // Defensive: blanks declared but never referenced by a marker.
        // Render them as a fallback list so the user can still answer.
        <div className="space-y-2">
          {orphanBlanks.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                #{b.id}
              </span>
              {renderBlankInput(b.id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClozePassageRenderer;
