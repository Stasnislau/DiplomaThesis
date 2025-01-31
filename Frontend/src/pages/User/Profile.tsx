import React from "react";
import Button from "@/components/common/Button";
import { UserStats } from "@/pages/User/components/userStats";
import { AchievementCard } from "@/pages/User/components/achievementCard";
import { LanguageProgress } from "@/pages/User/components/languageProgress";
import { useMe } from "@/api/hooks/useMe";

export const ProfilePage: React.FC = () => {
  const { me } = useMe();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-8">
            <div className="relative">
              <img
                src={
                    // me?.avatarUrl || 
                    "/default-avatar.png"}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500"
              />
              <button className="absolute bottom-0 right-0 bg-indigo-500 p-2 rounded-full text-white hover:bg-indigo-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {me?.name} {me?.surname}
                </h1>
                <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full">
                  {me?.role}
                </span>
              </div>
              <p className="text-gray-600 mb-2">ID: {me?.id}</p>
              <p className="text-gray-600 mb-4">{me?.email}</p>
              <div className="flex space-x-4">
                <Button variant="primary">Edit Profile</Button>
                <Button variant="secondary">Change Password</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid md:grid-cols-4 gap-6">
          <UserStats
            title="Quizzes Completed"
            // value={me?.stats?.quizzesCompleted || 0}
            value={0}
            icon="📝"
          />
          <UserStats
            title="Current Streak"
            // value={me?.stats?.currentStreak || 0}
            value={0}
            icon="🔥"
          />
          <UserStats
            title="Total XP"
            // value={me?.stats?.totalXP || 0}
            value={0}
            icon="⭐"
          />
          <UserStats
            title="Languages"
            // value={me?.stats?.languagesLearning || 0}
            value={0}
            icon="🌍"
          />
        </div>
      </div>

      {/* Language Progress */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Language Progress
          </h2>
          <div className="space-y-6">
            <LanguageProgress
              language="English"
              progress={75}
              level="Advanced"
              color="indigo"
            />
            <LanguageProgress
              language="Spanish"
              progress={45}
              level="Intermediate"
              color="purple"
            />
            <LanguageProgress
              language="French"
              progress={20}
              level="Beginner"
              color="pink"
            />
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recent Achievements
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <AchievementCard
              title="Quiz Master"
              description="Complete 100 quizzes"
              progress={85}
              icon="🏆"
            />
            <AchievementCard
              title="Streak Champion"
              description="Maintain a 30-day streak"
              progress={60}
              icon="⚡"
            />
            <AchievementCard
              title="Polyglot"
              description="Learn 5 languages"
              progress={40}
              icon="🌟"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
