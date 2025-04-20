import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";
import { FeatureCard } from "./components/FeatureCard";
import { StatCard } from "./components/StatCard";
import { HeroSection } from "./components/HeroSection";
import { LanguageCard } from "./components/LanguageCard";
import { NoLanguagesModal } from "@/components/modals/NoLanguagesModal";
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

const features = [
  {
    title: "Language Quiz",
    description:
      "Test your knowledge with interactive quizzes in multiple languages",
    linkTo: "/quiz",
    buttonText: "Start Quiz",
    buttonVariant: "primary" as const,
    gradientFrom: "cyan-400",
    gradientTo: "light-blue-500",
  },
  {
    title: "Practice Area",
    description: "Improve your skills with targeted practice exercises",
    linkTo: "/practice",
    buttonText: "Start Practice",
    buttonVariant: "secondary" as const,
    gradientFrom: "purple-400",
    gradientTo: "indigo-500",
  },
  {
    title: "Your Progress",
    description: "Track your learning journey and achievements",
    linkTo: "/profile",
    buttonText: "View Profile",
    buttonVariant: "tertiary" as const,
    gradientFrom: "pink-400",
    gradientTo: "rose-500",
  },
];

const stats = [
  { value: "6", label: "Languages Available" },
  { value: "1000+", label: "Practice Questions" },
  { value: "24/7", label: "Learning Support" },
];

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
  const [isNativeLanguageModalOpen, setIsNativeLanguageModalOpen] = useState(false);
  const { userLanguages } = useUserStore();

  const handleLanguageClick = (language: Language) => {
    navigate(`/placement/test/${language.code}`);
  };

  const handleLanguageSelect = (language: Language) => {
    // TODO: Implement API call to save selected language
    console.log("Selected language:", language);
    setIsNativeLanguageModalOpen(false);
  };

  useEffect(() => {
    if (userLanguages.length === 0) {
      setIsNativeLanguageModalOpen(true);
    }
  }, [userLanguages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {isNativeLanguageModalOpen && (
        <NoLanguagesModal onLanguageSelect={handleLanguageSelect} />
      )}

      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Available Languages
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages?.map((language) => (
            <LanguageCard
              key={language.code}
              flagIcon={flagIcons[language.code as keyof typeof flagIcons]}
              name={language.name}
              code={language.code}
              isStarted={
                userLanguages?.some(
                  (userLanguage) => userLanguage.id === language.id
                ) ?? false
              }
              onStartTest={() => handleLanguageClick(language)}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to start learning?
          </h2>
          <Link to="/quiz">
            <Button variant="primary" className="max-w-xs mx-auto">
              Take Your First Quiz
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
