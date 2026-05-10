import cn from "@/utils/cn";
import type { MatchingQuestion } from "@/api/mutations/generateQuiz";
import type { QuestionRendererProps } from "./types";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const norm = (s: string) => s.trim().toLowerCase();

// Eight readable pair-tag colours. We assign one per matched pair so
// the user can see, at a glance, which left item belongs to which
// right item without us drawing SVG lines.
const PAIR_TONES = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-orange-500",
];

const MatchingRenderer = ({
  question,
  answer,
  onChange,
  revealed,
}: QuestionRendererProps<MatchingQuestion>) => {
  const { t } = useTranslation();
  const [pendingLeft, setPendingLeft] = useState<string | null>(null);

  const userPairs: Record<string, string> =
    answer && typeof answer === "object" && !Array.isArray(answer)
      ? (answer as Record<string, string>)
      : {};

  // Right column shuffled once per question instance — otherwise the
  // matching task is trivial because the right side mirrors the left.
  const rightOptions = useMemo(() => {
    const rights = question.pairs.map((p) => p.right);
    // Fisher-Yates against a deterministic seed (question.question +
    // pair count) so re-renders don't reshuffle and disorient the user
    // mid-task.
    const seed = (question.question.length + question.pairs.length) * 31;
    const arr = [...rights];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [question]);

  const pickLeft = (left: string) => {
    if (revealed) return;
    setPendingLeft(left === pendingLeft ? null : left);
  };

  const pickRight = (right: string) => {
    if (revealed || pendingLeft === null) return;
    // If this right is already paired to another left, drop that
    // older binding so each right is used at most once.
    const next: Record<string, string> = {};
    for (const [l, r] of Object.entries(userPairs)) {
      if (l === pendingLeft || r === right) continue;
      next[l] = r;
    }
    next[pendingLeft] = right;
    setPendingLeft(null);
    onChange(next);
  };

  // Determine the stable pair-index for colouring (1-indexed display).
  const leftToIndex: Record<string, number> = {};
  question.pairs.forEach((p, i) => {
    leftToIndex[p.left] = i;
  });

  const correctMap: Record<string, string> = {};
  for (const p of question.pairs) correctMap[norm(p.left)] = norm(p.right);

  const renderTag = (idx: number | undefined, status?: "ok" | "bad") => {
    if (idx === undefined) return null;
    const tone =
      status === "ok"
        ? "bg-green-500"
        : status === "bad"
        ? "bg-red-500"
        : PAIR_TONES[idx % PAIR_TONES.length];
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ml-2 shrink-0",
          tone,
        )}
      >
        {idx + 1}
      </span>
    );
  };

  const renderRightBadge = (right: string) => {
    // Find which left (if any) is paired to this right.
    const matchedLeft = Object.entries(userPairs).find(
      ([, r]) => r === right,
    )?.[0];
    if (matchedLeft === undefined) return null;
    const idx = leftToIndex[matchedLeft];
    if (revealed) {
      const ok = norm(correctMap[norm(matchedLeft)] ?? "") === norm(right);
      return renderTag(idx, ok ? "ok" : "bad");
    }
    return renderTag(idx);
  };

  const renderLeftBadge = (left: string) => {
    if (!(left in userPairs)) return null;
    const idx = leftToIndex[left];
    if (revealed) {
      const ok = norm(userPairs[left]) === norm(correctMap[norm(left)] ?? "");
      return renderTag(idx, ok ? "ok" : "bad");
    }
    return renderTag(idx);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-violet-700 dark:text-violet-400 font-semibold">
        {t("tasks.matchingHint", {
          defaultValue: "Tap a term, then tap its match.",
        })}
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* LEFT column */}
        <div className="space-y-2">
          {question.pairs.map((p) => {
            const paired = p.left in userPairs;
            const pending = pendingLeft === p.left;
            return (
              <button
                type="button"
                key={p.left}
                onClick={() => pickLeft(p.left)}
                disabled={revealed}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all",
                  pending
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-300"
                    : paired
                    ? "border-violet-300 bg-white dark:bg-gray-800"
                    : "border-gray-200 dark:border-gray-700 hover:border-violet-300 bg-white dark:bg-gray-800 cursor-pointer",
                )}
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {p.left}
                </span>
                {renderLeftBadge(p.left)}
              </button>
            );
          })}
        </div>

        {/* RIGHT column (shuffled) */}
        <div className="space-y-2">
          {rightOptions.map((r) => {
            const usedBy = Object.entries(userPairs).find(
              ([, right]) => right === r,
            )?.[0];
            const isUsed = usedBy !== undefined;
            return (
              <button
                type="button"
                key={r}
                onClick={() => pickRight(r)}
                disabled={revealed || pendingLeft === null}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all",
                  isUsed
                    ? "border-violet-300 bg-white dark:bg-gray-800"
                    : pendingLeft !== null
                    ? "border-violet-200 hover:border-violet-500 bg-white dark:bg-gray-800 cursor-pointer"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-70",
                )}
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {r}
                </span>
                {renderRightBadge(r)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchingRenderer;
