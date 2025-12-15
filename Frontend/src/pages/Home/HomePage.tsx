import React from "react";
import { useNavigate } from "react-router-dom";
import { LanguageCard } from "./components/LanguageCard";
import {
  FrenchFlagIcon,
  GermanFlagIcon,
  ItalianFlagIcon,
  PolishFlagIcon,
  SpanishFlagIcon,
  RussianFlagIcon,
  BritishFlagIcon,
} from "@/assets/icons";
import {
  Language,
  useAvailableLanguages,
} from "@/api/hooks/useAvailableLanguages";
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
      title: "AI Settings",
      description: "Configure your AI tokens",
      path: "/settings/ai-tokens",
      icon: "⚙️",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-100",
      hoverBg: "hover:bg-blue-100",
      borderColor: "border-blue-200",
    },
    {
      title: "Tasks",
      description: "Practice writing and speaking",
      path: "/tasks",
      icon: "📝",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-100",
      hoverBg: "hover:bg-purple-100",
      borderColor: "border-purple-200",
    },
    {
      title: "Quiz",
      description: "Test your knowledge",
      path: "/quiz",
      icon: "🧩",
      bgColor: "bg-green-50",
      iconBg: "bg-green-100",
      hoverBg: "hover:bg-green-100",
      borderColor: "border-green-200",
    },
    {
      title: "Speech Analysis",
      description: "Analyze your pronunciation",
      path: "/speech-analysis",
      icon: "🎙️",
      bgColor: "bg-orange-50",
      iconBg: "bg-orange-100",
      hoverBg: "hover:bg-orange-100",
      borderColor: "border-orange-200",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user?.name || "Student"}! 👋
              </h1>
              <p className="mt-2 text-gray-600">
                Ready to continue your language learning journey?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-500">Learning</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {userLanguages?.length || 0} languages
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-xl">🌍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 px-1">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.path}
                onClick={() => navigate(shortcut.path)}
                className={`${shortcut.bgColor} ${shortcut.hoverBg} border ${shortcut.borderColor} rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`${shortcut.iconBg} w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <span className="text-2xl">{shortcut.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{shortcut.title}</h3>
                    <p className="text-sm text-gray-500">{shortcut.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Languages
            </h2>
            {languages && languages.length > 0 && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {languages.length} available
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {languages?.map((language) => {
              const isStarted = userLanguages?.some(
                (userLanguage) => userLanguage.id === language.id
              );
              return (
                <LanguageCard
                  key={language.code}
                  flagIcon={flagIcons[language.code as keyof typeof flagIcons]}
                  name={language.name}
                  code={language.code}
                  isStarted={isStarted}
                  currentLevel={
                    userLanguages?.find(
                      (userLanguage) => userLanguage.id === language.id
                    )?.level || language.currentLevel
                  }
                  onStartTest={() => handleLanguageClick(language)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
