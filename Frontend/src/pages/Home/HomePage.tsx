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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";

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
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Tasks",
      description: "Practice writing and speaking",
      path: "/tasks",
      icon: "📝",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Quiz",
      description: "Test your knowledge",
      path: "/quiz",
      icon: "🧩",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Speech Analysis",
      description: "Analyze your pronunciation",
      path: "/speech-analysis",
      icon: "🎙️",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || "Student"}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Ready to continue your language learning journey?
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shortcuts.map((shortcut) => (
              <Card
                key={shortcut.path}
                className="hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm"
                onClick={() => navigate(shortcut.path)}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className={`p-3 rounded-lg ${shortcut.color} mr-4`}>
                    <span className="text-2xl">{shortcut.icon}</span>
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {shortcut.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    {shortcut.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Your Languages
          </h2>
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
