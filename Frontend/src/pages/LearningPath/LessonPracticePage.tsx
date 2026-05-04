import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import { Lesson } from "@/api/hooks/useLearningPath";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isAnswerCorrect } from "@/utils/answerValidation";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { useCompleteLesson } from "@/api/hooks/useCompleteLesson";
import { useCreateBlankSpaceTask } from "@/api/hooks/useCreateBlankSpaceTask";
import { useCreateMultipleChoiceTask } from "@/api/hooks/useCreateMultipleChoiceTask";
import { useTranslation } from "react-i18next";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import {
  getLocalizedLesson,
  getLocalizedLessonType,
} from "@/utils/localizeContent";

const CORRECT_TO_COMPLETE = 5;

const TYPE_ICON: Record<string, string> = {
  vocabulary: "📚",
  grammar:    "📐",
  theory:     "📖",
  practice:   "🎯",
  listening:  "👂",
  speaking:   "🗣️",
};

const TYPE_COLOR: Record<string, string> = {
  vocabulary: "from-amber-500 to-yellow-500",
  grammar:    "from-blue-500 to-indigo-500",
  theory:     "from-purple-500 to-violet-500",
  practice:   "from-green-500 to-teal-500",
  listening:  "from-cyan-500 to-sky-500",
  speaking:   "from-rose-500 to-pink-500",
};

type TaskFlavour = "multiple-choice" | "fill-blank";

interface LessonState {
  lesson: Lesson;
  language: string;
  level: string;
}

interface CompletionScreenProps {
  lesson: Lesson;
  correctCount: number;
  taskCount: number;
  gradient: string;
  icon: string;
  onContinue: () => void;
  onRetry: () => void;
}

const CompletionScreen = ({
  lesson, correctCount, taskCount, gradient, icon, onContinue, onRetry,
}: CompletionScreenProps) => {
  const { t } = useTranslation();
  const accuracy = taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0;
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  const localizedLesson = getLocalizedLesson(lesson.title, lesson.description);
  const localizedType = getLocalizedLessonType(lesson.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className={`mx-auto w-28 h-28 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-2xl text-6xl animate-bounce`}>
          🏆
        </div>
        <div className="flex justify-center gap-2 text-4xl">
          {[1, 2, 3].map((s) => (
            <span key={s} className={s <= stars ? "opacity-100" : "opacity-20"}>⭐</span>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
            {t("learningPath.practice.completionTitle")}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {localizedLesson.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {icon} {localizedType} · {lesson.durationMinutes} min
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: t("learningPath.practice.correctLabel"),  value: correctCount,    color: "text-green-600 dark:text-green-400"  },
              { label: t("learningPath.practice.totalLabel"),    value: taskCount,       color: "text-indigo-600 dark:text-indigo-400" },
              { label: t("learningPath.practice.accuracyLabel"), value: `${accuracy}%`,  color: "text-amber-600 dark:text-amber-400"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              {t("learningPath.practice.practisedWordsTitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {lesson.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onContinue}
              className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${gradient} hover:opacity-90 transition shadow`}
            >
              {t("learningPath.practice.backButton")}
            </button>
            <button
              onClick={onRetry}
              className="w-full py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {t("learningPath.practice.retryButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LessonPracticePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state as LessonState | undefined;

  useEffect(() => {
    if (!state?.lesson) navigate("/learning-path", {
      replace: true,
      state: state ? { language: state.language, level: state.level } : undefined,
    });
  }, [state, navigate]);

  if (!state?.lesson) return null;

  const { lesson, language, level } = state;
  const taskLanguage = language.charAt(0).toUpperCase() + language.slice(1);

  return <LessonPracticeContent lesson={lesson} language={taskLanguage} level={level} />;
};

interface ContentProps { lesson: Lesson; language: string; level: string; }

const LessonPracticeContent = ({ lesson, language, level }: ContentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const localizedLesson = getLocalizedLesson(lesson.title, lesson.description);
  const localizedType = getLocalizedLessonType(lesson.type);

  const [currentTask,     setCurrentTask]     = useState<MultipleChoiceTask | FillInTheBlankTask | null>(null);
  const [userAnswer,      setUserAnswer]       = useState("");
  const [isCorrect,       setIsCorrect]        = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation]  = useState(false);
  const [taskCount,       setTaskCount]        = useState(0);
  const [correctCount,    setCorrectCount]     = useState(0);
  const [activeFlavour,   setActiveFlavour]    = useState<TaskFlavour>("multiple-choice");

  const { createTask: createMC, isLoading: loadMC, data: dataMC, reset: resetMC } = useCreateMultipleChoiceTask();
  const { createTask: createFB, isLoading: loadFB, data: dataFB, reset: resetFB } = useCreateBlankSpaceTask();
  const { explainAnswer, isLoading: explaining, data: explanationData }            = useExplainAnswer();
  const { completeLesson, isCompleting, completionData }                            = useCompleteLesson();

  const isLoading = loadMC || loadFB;

  useEffect(() => {
    const raw = dataMC ?? dataFB;
    if (raw && !isLoading) {
      setCurrentTask(raw as MultipleChoiceTask | FillInTheBlankTask);
    }
  }, [dataMC, dataFB, isLoading]);

  const taskPayload = {
    language,
    level,
    topic:    lesson.topic,
    keywords: lesson.keywords,
  };

  const generateTask = useCallback(() => {
    const roll: TaskFlavour = Math.random() < 0.5 ? "multiple-choice" : "fill-blank";
    setActiveFlavour(roll);
    setCurrentTask(null);
    setUserAnswer("");
    setIsCorrect(null);
    setShowExplanation(false);
    resetMC();
    resetFB();
    if (roll === "multiple-choice") createMC(taskPayload);
    else                            createFB(taskPayload);
    setTaskCount((c) => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, level, lesson.topic, lesson.keywords, createMC, createFB, resetMC, resetFB]);

  useEffect(() => { generateTask(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = () => {
    if (!currentTask || !userAnswer) return;

    let correct: boolean;
    if (isMultipleChoice(currentTask)) {
      const ca = currentTask.correctAnswer;
      correct = Array.isArray(ca) ? ca.includes(userAnswer) : ca === userAnswer;
    } else {
      correct = isAnswerCorrect(
        userAnswer,
        currentTask.correctAnswer as string | string[],
        { tolerance: 2, ignoreCase: true, trim: true },
      );
    }

    setIsCorrect(correct);
    if (correct) {
      const next = correctCount + 1;
      setCorrectCount(next);
      if (next >= CORRECT_TO_COMPLETE) {
        completeLesson({ lessonId: lesson.id, language, level });
      }
    }
  };

  const handleExplain = () => {
    if (!currentTask || !userAnswer) return;
    setShowExplanation(true);
    const ca = Array.isArray(currentTask.correctAnswer)
      ? currentTask.correctAnswer[0]
      : currentTask.correctAnswer;
    explainAnswer({ language, level, task: currentTask.question, correctAnswer: ca, userAnswer });
  };

  const handleRetry = () => {
    setTaskCount(0);
    setCorrectCount(0);
    generateTask();
  };

  const gradient = TYPE_COLOR[lesson.type] ?? "from-indigo-500 to-purple-500";
  const icon     = TYPE_ICON[lesson.type]  ?? "▶";

  if (completionData) {
    return (
      <CompletionScreen
        lesson={lesson}
        correctCount={correctCount}
        taskCount={taskCount}
        gradient={gradient}
        icon={icon}
        onContinue={() => navigate("/learning-path", {
          state: { language: language.toLowerCase(), level },
        })}
        onRetry={handleRetry}
      />
    );
  }

  if (isCompleting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 font-semibold">{t("learningPath.practice.savingMessage")}</p>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(Math.round((correctCount / CORRECT_TO_COMPLETE) * 100), 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        <Link
          to="/learning-path"
          state={{ language: language.toLowerCase(), level }}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {t("learningPath.practice.backLink")}
        </Link>

        <div className={`bg-gradient-to-r ${gradient} rounded-3xl p-6 text-white shadow-xl`}>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  {localizedType}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  {level}
                </span>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">
                  ⏱ {lesson.durationMinutes} min
                </span>
              </div>
              <h1 className="text-2xl font-bold">{localizedLesson.title}</h1>
              <p className="text-white/80 text-sm mt-1">{localizedLesson.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {lesson.keywords.map((kw, i) => (
              <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-gray-500 dark:text-gray-400">{t("learningPath.practice.progressLabel")}</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {t("learningPath.practice.progressStats", {
                correctCount,
                target: CORRECT_TO_COMPLETE,
              })}
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {t("learningPath.practice.completionMessage", {
              count: CORRECT_TO_COMPLETE - correctCount,
            })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t("learningPath.practice.tasksLabel"), value: taskCount,    color: "text-indigo-600 dark:text-indigo-400" },
            { label: t("learningPath.practice.correctLabel"),  value: correctCount,  color: "text-green-600 dark:text-green-400"   },
            {
              label: t("learningPath.practice.accuracyLabel"),
              value: taskCount > 0 ? `${Math.round((correctCount / taskCount) * 100)}%` : "—",
              color: "text-amber-600 dark:text-amber-400",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {t("learningPath.practice.exerciseTypeLabel")}
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-sm">
            {activeFlavour === "multiple-choice"
              ? t("learningPath.practice.exerciseTypeMC")
              : t("learningPath.practice.exerciseTypeFB")}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t("learningPath.practice.exerciseRandom")}</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("learningPath.practice.generatingMessage", {
                  flavour: activeFlavour,
                  topic: lesson.topic,
                })}
              </p>
            </div>
          )}

          {!isLoading && !currentTask && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t("learningPath.practice.readyMessage")}</p>
            </div>
          )}

          {currentTask && !isLoading && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm`}>
                  {icon}
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {lesson.topic}
                </p>
              </div>
              <TaskComponent
                taskData={currentTask}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                onCheckAnswer={handleCheck}
                onExplainAnswer={handleExplain}
                isCorrect={isCorrect}
                isExplaining={explaining}
                explanationData={explanationData}
                showExplanation={showExplanation}
              />
            </div>
          )}
        </div>

        <button
          onClick={generateTask}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all shadow-lg bg-gradient-to-r ${gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading
            ? t("learningPath.practice.generating")
            : currentTask
              ? t("learningPath.practice.nextExercise")
              : t("learningPath.practice.generateExercise")}
        </button>
      </div>
    </div>
  );
};

export default LessonPracticePage;
