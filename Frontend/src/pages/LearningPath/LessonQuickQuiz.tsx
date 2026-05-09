import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import { useCallback, useEffect, useState } from "react";

import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isAnswerCorrect } from "@/utils/answerValidation";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { useCreateBlankSpaceTask } from "@/api/hooks/useCreateBlankSpaceTask";
import { useCreateMultipleChoiceTask } from "@/api/hooks/useCreateMultipleChoiceTask";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { useTranslation } from "react-i18next";

const CORRECT_TO_PASS = 5;

interface LessonQuickQuizProps {
  language: string;
  level: string;
  topic: string;
  keywords: string[];
  /** Fired exactly once when the learner crosses the pass threshold
   *  (CORRECT_TO_PASS correct answers). Lesson page completes the
   *  lesson on that signal. */
  onPassed?: () => void;
}

type Flavour = "multiple-choice" | "fill-blank";

/**
 * Compact reusable quiz: alternating multiple-choice / fill-in-blank
 * questions over the lesson topic + keywords. Used both as an
 * alternative mode for writing_essay lessons (so the learner can warm
 * up on the lesson vocabulary) and reused by the regular quiz lessons.
 */
const LessonQuickQuiz = ({
  language,
  level,
  topic,
  keywords,
  onPassed,
}: LessonQuickQuizProps) => {
  const { t } = useTranslation();

  const [task, setTask] = useState<MultipleChoiceTask | FillInTheBlankTask | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [flavour, setFlavour] = useState<Flavour>("multiple-choice");
  const [hasPassed, setHasPassed] = useState(false);

  const { createTask: createMC, isLoading: loadMC, data: dataMC, reset: resetMC } = useCreateMultipleChoiceTask();
  const { createTask: createFB, isLoading: loadFB, data: dataFB, reset: resetFB } = useCreateBlankSpaceTask();
  const { explainAnswer, isLoading: explaining, data: explanationData } = useExplainAnswer();

  const isLoading = loadMC || loadFB;

  useEffect(() => {
    const raw = dataMC ?? dataFB;
    if (raw && !isLoading) {
      setTask(raw as MultipleChoiceTask | FillInTheBlankTask);
    }
  }, [dataMC, dataFB, isLoading]);

  const generate = useCallback(() => {
    const roll: Flavour = Math.random() < 0.5 ? "multiple-choice" : "fill-blank";
    setFlavour(roll);
    setTask(null);
    setUserAnswer("");
    setIsCorrect(null);
    setShowExplanation(false);
    resetMC();
    resetFB();
    const payload = { language, level, topic, keywords };
    if (roll === "multiple-choice") createMC(payload);
    else createFB(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level, topic, keywords]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheck = () => {
    if (!task || !userAnswer || isCorrect !== null) return;

    let ok: boolean;
    if (isMultipleChoice(task)) {
      const ca = task.correctAnswer;
      ok = Array.isArray(ca) ? ca.includes(userAnswer) : ca === userAnswer;
    } else {
      ok = isAnswerCorrect(
        userAnswer,
        task.correctAnswer as string | string[],
        { tolerance: 2, ignoreCase: true, trim: true },
      );
    }

    setIsCorrect(ok);
    setTaskCount((n) => n + 1);
    if (ok) {
      const next = correctCount + 1;
      setCorrectCount(next);
      if (!hasPassed && next >= CORRECT_TO_PASS) {
        setHasPassed(true);
        onPassed?.();
      }
    }
  };

  const handleExplain = () => {
    if (!task || !userAnswer) return;
    setShowExplanation(true);
    const ca = Array.isArray(task.correctAnswer)
      ? task.correctAnswer[0]
      : task.correctAnswer;
    explainAnswer({ language, level, task: task.question, correctAnswer: ca, userAnswer });
  };

  const accuracy = taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("learningPath.practice.tasksLabel"), value: taskCount, color: "text-indigo-600 dark:text-indigo-400" },
          { label: t("learningPath.practice.correctLabel"), value: correctCount, color: "text-green-600 dark:text-green-400" },
          {
            label: t("learningPath.practice.accuracyLabel"),
            value: taskCount > 0 ? `${accuracy}%` : "—",
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {t("learningPath.practice.exerciseTypeLabel")}
        </span>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-sm">
          {flavour === "multiple-choice"
            ? t("learningPath.practice.exerciseTypeMC")
            : t("learningPath.practice.exerciseTypeFB")}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("learningPath.practice.generatingMessage", { flavour, topic })}
            </p>
          </div>
        )}

        {!isLoading && task && (
          <TaskComponent
            taskData={task}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onCheckAnswer={handleCheck}
            onExplainAnswer={handleExplain}
            isCorrect={isCorrect}
            isExplaining={explaining}
            explanationData={explanationData}
            showExplanation={showExplanation}
          />
        )}

        {!isLoading && task && isCorrect !== null && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={generate}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              {t("learningPath.practice.nextExercise")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonQuickQuiz;
