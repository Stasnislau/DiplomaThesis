import React, { useState } from "react";

import type { Achievement } from "@/api/queries/getAchievements";
import { AchievementCard } from "@/pages/User/components/achievementCard";
import Avatar from "@/components/common/Avatar";
import { ChangePasswordModal } from "./components/modals/ChangePasswordModal";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { EditProfileModal } from "./components/modals/EditProfileModal";
import { GearIcon } from "@radix-ui/react-icons";
import { LanguageLevel } from "@/types/models/LanguageLevel";
import { LanguageProgressItem } from "@/pages/User/components/languageProgressItem";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { Link } from "react-router-dom";
import Spinner from "@/components/common/Spinner";
import { ThemeSelector } from "@/components/common/ThemeToggle";
import { UserStats } from "@/pages/User/components/userStats";
import { useAchievements } from "@/api/hooks/useAchievements";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { useMe } from "@/api/hooks/useMe";
import { useTranslation } from "react-i18next";

const SettingsIcon = ({ className }: { className?: string }) => (
  <GearIcon className={className} />
);

const mapLevelToString = (
  level: LanguageLevel | string
): {
  level: string;
  color: string;
  progress: number;
} => {
  switch (level) {
    case LanguageLevel.A0:
    case LanguageLevel.A1:
      return {
        level: "Beginner",
        color: "indigo",
        progress: 25,
      };
    case LanguageLevel.A2:
      return {
        level: "Elementary",
        color: "purple",
        progress: 40,
      };
    case LanguageLevel.B1:
      return {
        level: "Intermediate",
        color: "blue",
        progress: 50,
      };
    case LanguageLevel.B2:
      return {
        level: "Upper-Intermediate",
        color: "blue",
        progress: 75,
      };
    case LanguageLevel.C1:
      return {
        level: "Advanced",
        color: "green",
        progress: 90,
      };
    case LanguageLevel.C2:
      return {
        level: "Proficient",
        color: "gold",
        progress: 99,
      };
    case LanguageLevel.NATIVE:
      return {
        level: "Native",
        color: "gold",
        progress: 100,
      };
    default:
      return {
        level: "Unknown",
        color: "gray",
        progress: 0,
      };
  }
};

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { me, isLoading, error } = useMe();
  const { languages, isLoading: isLoadingLanguages } = useAvailableLanguages();
  const { achievements, isLoading: isLoadingAchievements } = useAchievements();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <Spinner size={32} color="#4F46E5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 dark:bg-gray-900 dark:text-red-400">
        {t('common.error')}: {error.message}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">
        {t('auth.noAccount')}
      </div>
    );
  }

  const languagesCount = me.languages?.length || 0;
  const achievementsCount = achievements.filter((a: Achievement) => a.isUnlocked).length;

  const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    learning: { label: "Learning", icon: "📚" },
    speaking: { label: "Speaking", icon: "🎙️" },
    streak: { label: "Streak & Habits", icon: "🔥" },
    exploration: { label: "Exploration", icon: "🧭" },
    mastery: { label: "Mastery", icon: "🌟" },
  };

  const groupedAchievements = achievements.reduce(
    (acc: Record<string, Achievement[]>, ach: Achievement) => {
      if (!acc[ach.category]) acc[ach.category] = [];
      acc[ach.category].push(ach);
      return acc;
    },
    {} as Record<string, Achievement[]>,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 transition-colors duration-300">
      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 mb-8 relative transition-colors duration-300">
          <div className="absolute top-8 right-8">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <button 
                  className="p-2 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={t('settings.title')}
                >
                  <SettingsIcon className="h-6 w-6" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content align="end" className="w-56">
                <DropdownMenu.Item
                  onSelect={() => setIsEditProfileOpen(true)}
                  className="cursor-pointer"
                >
                  {t('common.edit')} {t('nav.profile')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setIsChangePasswordOpen(true)}
                  className="cursor-pointer"
                >
                  {t('auth.password')}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item asChild className="cursor-pointer">
                  <Link to="/settings/ai-tokens">Manage AI Providers</Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div className="relative flex-shrink-0">
              <Avatar
                name={me.name || ""}
                className="border-4 border-indigo-500 dark:border-indigo-400 w-32 h-32 md:w-32 md:h-32 text-4xl"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {me.name} {me.surname}
                </h1>
                <span className="px-3 py-1 text-xs sm:text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full font-medium">
                  {me.role?.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm sm:text-base">
                ID: {me.id}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base">
                {me.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <UserStats title={t('dashboard.languages')} value={languagesCount} icon="🌍" />
          <UserStats
            title={t('dashboard.achievements')}
            value={achievementsCount}
            icon="🏆"
          />
          <UserStats title={t('dashboard.totalXp')} value={0} icon="⭐" />
          <UserStats title={t('dashboard.streak')} value={0} icon="🔥" />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('settings.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ThemeSelector className="w-full" />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.language')}
              </label>
              <LanguageSelector className="w-full" />
            </div>
          </div>
        </div>
      </div>

      {!isLoading && me?.languages && me.languages.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 transition-colors duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t('languages.proficiencyLevel')}
            </h2>
            <div className="space-y-6">
              {me.languages.map((lang, index) => (
                <LanguageProgressItem
                  key={lang.id + index}
                  languageName={
                    languages?.find((l) => l.id === lang.languageId)?.name || ""
                  }
                  progress={mapLevelToString(lang.level).progress}
                  level={mapLevelToString(lang.level).level}
                  color={mapLevelToString(lang.level).color}
                  isLoading={isLoadingLanguages}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Achievements
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {achievementsCount} / {achievements.length} unlocked
            </span>
          </div>
          {isLoadingAchievements ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size={32} color="#4F46E5" />
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No achievements yet. Seed them via the API first.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span>{CATEGORY_LABELS[category]?.icon || "🎯"}</span>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {CATEGORY_LABELS[category]?.label || category}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(categoryAchievements as Achievement[]).map((ach: Achievement) => (
                      <AchievementCard
                        key={ach.id}
                        title={ach.name}
                        description={ach.description}
                        icon={ach.icon}
                        progress={ach.progress}
                        maxProgress={ach.maxProgress}
                        isUnlocked={ach.isUnlocked}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};
