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

import Button from "@/components/common/Button";
import { FeatureCard } from "./components/FeatureCard";
import { HeroSection } from "./components/HeroSection";
import { LanguageCard } from "./components/LanguageCard";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import React from "react";
import { StatCard } from "./components/StatCard";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTranslation } from "react-i18next";

const flagIcons = {
  es: <SpanishFlagIcon className="w-12 h-12" />,
  fr: <FrenchFlagIcon className="w-12 h-12" />,
  de: <GermanFlagIcon className="w-12 h-12" />,
  it: <ItalianFlagIcon className="w-12 h-12" />,
  pl: <PolishFlagIcon className="w-12 h-12" />,
  en: <BritishFlagIcon className="w-12 h-12" />,
  ru: <RussianFlagIcon className="w-12 h-12" />,
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { languages } = useAvailableLanguages();

  // Features data with translations
  const features = [
    {
      title: t('dashboard.testKnowledge') || "Language Quiz",
      description: "Test your knowledge with interactive quizzes in multiple languages", 
      linkTo: "/register",
      buttonText: t('common.submit') || "Start Learning",
      buttonVariant: "primary" as const,
      gradientFrom: "cyan-400",
      gradientTo: "light-blue-500",
    },
    {
      title: t('dashboard.practice') || "Practice Area",
      description: "Improve your skills with targeted practice exercises",
      linkTo: "/register",
      buttonText: t('landing.getStarted') || "Get Started",
      buttonVariant: "secondary" as const,
      gradientFrom: "purple-400",
      gradientTo: "indigo-500",
    },
    {
      title: "Track Progress", // Add key if missed
      description: "Track your learning journey and achievements",
      linkTo: "/register",
      buttonText: t('landing.createFreeAccount') || "Create Account",
      buttonVariant: "tertiary" as const,
      gradientFrom: "pink-400",
      gradientTo: "rose-500",
    },
  ];

  const stats = [
    { value: "6", label: t('landing.stats.languages') || "Languages Available" },
    { value: "1000+", label: t('landing.stats.questions') || "Practice Questions" },
    { value: "24/7", label: t('landing.stats.support') || "Learning Support" },
  ];

  const handleLanguageClick = (_: Language) => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      
      {/* Header Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center sm:text-left">
          {t('landing.availableLanguages') || "Available Languages"}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages?.map((language) => {
            return (
              <LanguageCard
                key={language.code}
                flagIcon={flagIcons[language.code as keyof typeof flagIcons]}
                name={t(`languages.${language.name.toLowerCase()}`) || language.name}
                code={language.code}
                isStarted={false}
                onStartTest={() => handleLanguageClick(language)}
                onContinue={() => handleLanguageClick(language)}
              />
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center sm:text-left">
           {t('landing.features') || "Features"}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 transition-colors duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('landing.readyToStart') || "Ready to start learning?"}
          </h2>
          <Link to="/register">
            <Button variant="primary" className="max-w-xs mx-auto text-lg h-14 px-8 rounded-full shadow-lg shadow-indigo-500/30">
              {t('landing.createFreeAccount') || "Create Free Account"}
            </Button>
          </Link>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('landing.alreadyHaveAccount') || "Already have an account?"}{" "}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              {t('landing.login') || "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
