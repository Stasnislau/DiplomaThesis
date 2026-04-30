import { Lesson, Module, useLearningPath } from "@/api/hooks/useLearningPath";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useState } from "react";
import { useTranslation } from "react-i18next";

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300", border: "border-green-300 dark:border-green-700" },
  A2: { bg: "bg-teal-100 dark:bg-teal-900/40",  text: "text-teal-700 dark:text-teal-300",   border: "border-teal-300 dark:border-teal-700" },
  B1: { bg: "bg-blue-100 dark:bg-blue-900/40",  text: "text-blue-700 dark:text-blue-300",   border: "border-blue-300 dark:border-blue-700" },
  B2: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300 dark:border-violet-700" },
  C1: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300 dark:border-orange-700" },
  C2: { bg: "bg-red-100 dark:bg-red-900/40",    text: "text-red-700 dark:text-red-300",     border: "border-red-300 dark:border-red-700" },
};

const TYPE_ICONS: Record<string, string> = {
  vocabulary: "📚",
  grammar:    "📐",
  theory:     "📖",
  practice:   "🎯",
  listening:  "👂",
  speaking:   "🗣️",
};

const TYPE_COLORS: Record<string, string> = {
  vocabulary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  grammar:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  theory:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  practice:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  listening:  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  speaking:   "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

interface LessonCardProps {
  lesson: Lesson;
  onStart: () => void;
}

const LessonCard = ({ lesson, onStart }: LessonCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isLocked = lesson.status === "LOCKED";
  const isCompleted = lesson.status === "COMPLETED";

  return (
    <div
      className={`
        rounded-2xl border transition-all duration-200
        ${isLocked
          ? "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 opacity-60"
          : isCompleted
            ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500"
        }
      `}
    >
      {/* Lesson Header */}
      <div
        className={`flex items-start gap-3 p-4 ${!isLocked ? "cursor-pointer" : ""}`}
        onClick={() => !isLocked && setExpanded((e) => !e)}
        role={!isLocked ? "button" : undefined}
        aria-expanded={expanded}
      >
        {/* Status icon */}
        <div className={`
          h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg
          ${isCompleted
            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            : isLocked
              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          }
        `}>
          {isCompleted ? "✓" : isLocked ? "🔒" : TYPE_ICONS[lesson.type] || "▶"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`font-semibold text-sm truncate ${isLocked ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}>
              {lesson.title}
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[lesson.type] || "bg-gray-100 text-gray-600"}`}>
              {lesson.type}
            </span>
          </div>
          <p className={`text-xs ${isLocked ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
            {lesson.description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            ⏱ {lesson.durationMinutes}m
          </span>
          {!isLocked && (
            <span className={`text-gray-400 text-sm transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && !isLocked && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          {/* Keywords */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Key Words & Concepts
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lesson.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={onStart}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors duration-200 shadow-sm hover:shadow"
          >
            {isCompleted ? "📖 Review Lesson" : "▶ Start Lesson"}
          </button>
        </div>
      )}
    </div>
  );
};

interface ModuleCardProps {
  module: Module;
  onLessonStart: (lesson: Lesson, language: string, level: string) => void;
  language: string;
  level: string;
}

const ModuleCard = ({ module, onLessonStart, language, level }: ModuleCardProps) => {
  const [collapsed, setCollapsed] = useState(module.progress === 100);
  const colors = LEVEL_COLORS[module.level] || LEVEL_COLORS["A1"];

  const completedCount = module.lessons.filter((l) => l.status === "COMPLETED").length;

  return (
    <div className="relative md:pl-20">
      {/* Connector Dot */}
      <div className={`absolute left-5 top-8 w-7 h-7 rounded-full border-4 border-white dark:border-gray-900 z-10 hidden md:block shadow-md ${module.progress === 100 ? "bg-green-500" : module.progress > 0 ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`} />

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
        {/* Module Header */}
        <div
          className="p-5 cursor-pointer select-none"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {module.level}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  🎨 {module.theme}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{module.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{module.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-gray-400 dark:text-gray-500">{completedCount}/{module.lessons.length}</span>
              <span className={`text-gray-400 text-lg transition-transform ${collapsed ? "" : "rotate-180"}`}>▾</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${module.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lessons */}
        {!collapsed && (
          <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            {module.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onStart={() => onLessonStart(lesson, language, level)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const LearningPathPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const userLanguage = location.state?.language || "english";
  const userLevel = location.state?.level || "A1";

  const { data: learningPath, isLoading, error } = useLearningPath(userLanguage, userLevel);

  const handleLessonStart = (lesson: Lesson, language: string) => {
    navigate("/lesson", {
      state: { lesson, language, level: userLevel },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-12 h-12 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{t("learningPath.loadingJourney")}</p>
      </div>
    );
  }

  if (error || !learningPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">{t("learningPath.loadFailed")}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("learningPath.bridgeOffline")}</p>
        </div>
      </div>
    );
  }

  const totalLessons = learningPath.modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedLessons = learningPath.modules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.status === "COMPLETED").length, 0
  );
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4">
            ← {t("nav.home")}
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
                Learning Path
              </p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                {userLanguage} — {userLevel}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Your structured journey from {userLevel} to mastery.
              </p>
            </div>

            {/* Overall progress */}
            <div className="w-full sm:w-48 flex-shrink-0">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>{t("learningPath.overallProgress")}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{overallProgress}%</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{completedLessons} / {totalLessons} lessons</p>
            </div>
          </div>
        </div>

        {/* Level Legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(LEVEL_COLORS).map(([lvl, c]) => (
            <span key={lvl} className={`text-xs font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
              {lvl}
            </span>
          ))}
        </div>

        {/* Modules */}
        <div className="space-y-6 relative">
          {/* Connection Line */}
          <div className="absolute left-8 top-8 bottom-8 w-1 bg-gray-200 dark:bg-gray-700 hidden md:block rounded-full" />

          {learningPath.modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              language={userLanguage}
              level={userLevel}
              onLessonStart={handleLessonStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningPathPage;
