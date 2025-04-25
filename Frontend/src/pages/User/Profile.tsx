import React from "react";
import Button from "@/components/common/Button";
import { UserStats } from "@/pages/User/components/userStats";
import { AchievementCard } from "@/pages/User/components/achievementCard";
import { LanguageProgress } from "@/pages/User/components/languageProgress";
import { useMe } from "@/api/hooks/useMe";
import Spinner from "@/components/common/Spinner";
import { LanguageLevel } from "@/types/models/LanguageLevel";

// Helper function to map LanguageLevel enum to readable string
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
        color: "red",
        progress: 99,
      };
    case LanguageLevel.NATIVE:
      return {
        level: "Native",
        color: "red",
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
  const { me, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={32} color="#4F46E5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error loading profile data: {error.message}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        User data not found.
      </div>
    );
  }

  const languagesCount = me.languages?.length || 0;
  const achievementsCount = 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-10">
      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div className="relative flex-shrink-0">
              <img
                src={"/default-avatar.png"}
                alt="Profile"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-indigo-500"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? (
                    <Spinner size={24} color="#4F46E5" />
                  ) : (
                    `${me?.name || ""} ${me?.surname || ""}`
                  )}
                </h1>
                <span className="px-3 py-1 text-xs sm:text-sm bg-indigo-100 text-indigo-800 rounded-full font-medium">
                  {isLoading ? (
                    <Spinner size={12} color="#4F46E5" />
                  ) : (
                    me?.role?.toUpperCase()
                  )}
                </span>
              </div>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">
                ID: {isLoading ? <Spinner size={12} color="#6B7280" /> : me?.id}
              </p>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                {isLoading ? <Spinner size={12} color="#6B7280" /> : me?.email}
              </p>
              <div className="flex justify-center sm:justify-start space-x-4">
                <Button variant="primary" disabled={isLoading}>
                  Edit Profile
                </Button>
                <Button variant="secondary" disabled={isLoading}>
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Updated */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <UserStats title="Languages" value={languagesCount} icon="🌍" />
          <UserStats
            title="Achievements"
            value={isLoading ? 0 : achievementsCount}
            icon="🏆"
          />
          <UserStats title="Total XP" value={0} icon="⭐" />
          <UserStats title="Streak" value={0} icon="🔥" />
        </div>
      </div>

      {/* Language Progress - Updated */}
      {!isLoading && me?.languages && me.languages.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Language Progress
            </h2>
            <div className="space-y-6">
              {me.languages.map((lang, index) => (
                <LanguageProgress
                  key={lang.id + index}
                  language={lang.name}
                  progress={mapLevelToString(lang.currentLevel).progress  }
                  level={mapLevelToString(lang.currentLevel).level}
                  color={mapLevelToString(lang.currentLevel).color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-white rounded-3xl shadow-lg p-8 flex justify-center items-center h-40">
            <Spinner size={32} color="#4F46E5" />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Achievements
          </h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size={32} color="#4F46E5" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Placeholder Achievements */}
              <AchievementCard
                key="placeholder-1"
                title="Early Bird"
                description="Log in before 8 AM"
                icon="☀️"
                progress={0}
              />
              <AchievementCard
                key="placeholder-2"
                title="Quick Learner"
                description="Complete a lesson in 5 minutes"
                icon="⚡"
                progress={0}
              />
              <AchievementCard
                key="placeholder-3"
                title="Explorer"
                description="Try out a new language"
                icon="🧭"
                progress={0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
