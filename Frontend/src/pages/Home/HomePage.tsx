import {
  BritishFlagIcon,
  FrenchFlagIcon,
  GermanFlagIcon,
  ItalianFlagIcon,
  PolishFlagIcon,
  RussianFlagIcon,
  SpanishFlagIcon,
} from "@/assets/icons";
import {
  Language,
  useAvailableLanguages,
} from "@/api/hooks/useAvailableLanguages";
import { Link, useNavigate } from "react-router-dom";

import { LanguageCard } from "./components/LanguageCard";
import React from "react";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/useUserStore";

const flagIcons = {
  es: <SpanishFlagIcon className="w-12 h-12" />,
  fr: <FrenchFlagIcon className="w-12 h-12" />,
  de: <GermanFlagIcon className="w-12 h-12" />,
  it: <ItalianFlagIcon className="w-12 h-12" />,
  pl: <PolishFlagIcon className="w-12 h-12" />,
  en: <BritishFlagIcon className="w-12 h-12" />,
  ru: <RussianFlagIcon className="w-12 h-12" />,
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { languages } = useAvailableLanguages();
  const { user, userLanguages } = useUserStore((state) => ({
    user: state.user,
    userLanguages: state.userLanguages,
  }));

  const handleLanguageClick = (language: Language) => {
    navigate(`/placement/test/${language.code}`);
  };

  const shortcuts = [
    {
      title: t('dashboard.aiSettings'),
      description: t('dashboard.configureAI'),
      path: "/settings/ai-tokens",
      icon: "⚙️",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      title: t('nav.tasks'),
      description: t('dashboard.practice'),
      path: "/tasks",
      icon: "📝",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/30",
      borderColor: "border-purple-200 dark:border-purple-800",
    },
    {
      title: t('nav.quiz'),
      description: t('dashboard.testKnowledge'),
      path: "/quiz",
      icon: "🧩",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      hoverBg: "hover:bg-green-100 dark:hover:bg-green-900/30",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      title: t('nav.speechAnalysis'),
      description: t('dashboard.analyzePronunciation'),
      path: "/speech-analysis",
      icon: "🎙️",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 mb-8 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {t('dashboard.welcome', { name: user?.name || "Student" })}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.learning')}</p>
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {userLanguages?.length || 0} {t('dashboard.languagesCount')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl" role="img" aria-label="Globe">🌍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 px-1">
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.path}
                to={shortcut.path}
                className={`${shortcut.bgColor} ${shortcut.hoverBg} border ${shortcut.borderColor} block rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                aria-label={`Go to ${shortcut.title}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`${shortcut.iconBg} w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <span className="text-2xl" role="img" aria-hidden="true">{shortcut.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{shortcut.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{shortcut.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('dashboard.yourLanguages')}
            </h2>
            {languages && languages.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {languages.length} {t('dashboard.available')}
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {languages?.map((language) => {
              const matchedUserLang = userLanguages?.find(
                (ul) => ul.languageId === language.id
              );
              const isStarted = !!matchedUserLang;
              return (
                <LanguageCard
                  key={language.code}
                  flagIcon={flagIcons[language.code as keyof typeof flagIcons]}
                  name={t(`languages.${language.name.toLowerCase()}`) || language.name}
                  code={language.code}
                  isStarted={isStarted}
                  currentLevel={
                    matchedUserLang?.level || language.currentLevel
                  }
                  onStartTest={() => handleLanguageClick(language)}
                  onContinue={() => navigate("/learning-path", {
                    state: {
                      language: language.name.toLowerCase(),
                      level: matchedUserLang?.level || "A1",
                    },
                  })}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
