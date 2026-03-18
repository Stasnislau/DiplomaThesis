import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";

import ListeningTask from "./components/ListeningTask";
import MaterialsTask from "./components/MaterialsTask";
import SpeakingTask from "./components/SpeakingTask";
import WritingTask from "./components/WritingTask";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const TasksPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const initialLanguage = location.state?.language;
  const initialLevel = location.state?.level;

  const typeParam = searchParams.get("type");
  const defaultTab = useMemo(() => {
    if (!typeParam) return "writing";
    
    switch (typeParam.toLowerCase()) {
      case "listening":
        return "listening";
      case "speaking":
      case "pronunciation":
        return "speaking";
      case "vocabulary":
      case "grammar": 
      case "theory":
      case "practice":
      default:
        return "writing";
    }
  }, [typeParam]);

  const shortcuts = [
    {
      title: t('nav.quiz') || "Quiz",
      description: "Test your knowledge",
      path: "/quiz",
      icon: "🧩",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      hoverBg: "hover:bg-green-100 dark:hover:bg-green-900/30",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      title: t('nav.speechAnalysis') || "Speech Analysis",
      description: "Analyze pronunciation",
      path: "/speech-analysis",
      icon: "🎙️",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
  ];

  const initialTaskType = useMemo(() => {
    if (typeParam?.toLowerCase() === "vocabulary") return "fill-blank";
    return "multiple-choice";
  }, [typeParam]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors duration-200 mb-6 group"
        >
          <span className="text-lg transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true">←</span>
          <span className="font-medium">{t('nav.home')}</span>
        </Link>


        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 mb-6 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <span className="text-white text-2xl" role="img" aria-label="Tasks icon">📝</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {t('nav.tasks')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Improve your language skills {typeParam ? `- ${typeParam.charAt(0).toUpperCase() + typeParam.slice(1)}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.path}
                onClick={() => navigate(shortcut.path)}
                className={`${shortcut.bgColor} ${shortcut.hoverBg} border ${shortcut.borderColor} flex-1 min-w-[200px] text-left rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                aria-label={`Go to ${shortcut.title}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${shortcut.iconBg} w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <span className="text-xl" role="img" aria-hidden="true">{shortcut.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{shortcut.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{shortcut.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 transition-colors duration-300">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-xl mb-6">
              <TabsTrigger 
                value="writing" 
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-md data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white dark:text-gray-300"
              >
                <span className="mr-1.5" role="img" aria-hidden="true">✍️</span>
                {t('tasks.writing')}
              </TabsTrigger>
              <TabsTrigger 
                value="speaking"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-md data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white dark:text-gray-300"
              >
                <span className="mr-1.5" role="img" aria-hidden="true">🗣️</span>
                {t('tasks.speaking')}
              </TabsTrigger>
              <TabsTrigger 
                value="listening"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-md data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white dark:text-gray-300"
              >
                <span className="mr-1.5" role="img" aria-hidden="true">👂</span>
                {t('tasks.listening')}
              </TabsTrigger>
              <TabsTrigger 
                value="materials"
                className="rounded-lg py-3 px-3 text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-md data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 dark:text-gray-300"
              >
                <span className="mr-1.5" role="img" aria-hidden="true">📄</span>
                PDF Tasks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="writing">
              <WritingTask 
                initialLanguage={initialLanguage} 
                initialLevel={initialLevel} 
                initialTaskType={initialTaskType}
              />
            </TabsContent>
            <TabsContent value="speaking">
              <SpeakingTask />
            </TabsContent>
            <TabsContent value="listening">
              <ListeningTask />
            </TabsContent>
            <TabsContent value="materials">
              <MaterialsTask />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
