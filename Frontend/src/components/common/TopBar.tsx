import React, { useEffect, useState } from "react";

import { LanguageSelector } from "./LanguageSelector";
import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";

export const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const { userRole, isAuthenticated } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  const navOptions = [
    { label: t("nav.home"), value: "home", path: "/" },
    { label: t("nav.tasks"), value: "tasks", path: "/tasks" },
    { label: t("nav.quiz"), value: "quiz", path: "/quiz" },
    { label: t("nav.speechAnalysis"), value: "speech-analysis", path: "/speech-analysis" },
    { label: t("nav.history"), value: "history", path: "/history" },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      setIsAdmin(userRole === "ADMIN");
    }
  }, [isAuthenticated, userRole]);

  return (
    <div className="bg-gradient-to-r from-cyan-400 to-blue-500 dark:from-cyan-900 dark:to-blue-900 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex-shrink-0">
            <Link to="/" className="text-white font-bold text-xl hover:text-gray-100 transition-colors">
              EasyLanguage
            </Link>
          </div>
          <nav className="flex space-x-4 items-center" role="navigation" aria-label="Main Navigation">
            {isAdmin && isAuthenticated && (
              <Link
                to="/admin"
                className="text-white hover:bg-white/20 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-white"
              >
                {t("nav.admin")}
              </Link>
            )}
            {isAuthenticated && (
              <NavBar
                options={navOptions}
                defaultLabel={t("nav.menu")}
                className="text-white hover:bg-white/20 focus:ring-2 focus:ring-white"
              />
            )}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <Link
                to="/login"
                className="text-white hover:bg-white/20 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-white"
              >
                {t('nav.login')}
              </Link>
            )}
            <ThemeToggle />
            <LanguageSelector />
          </nav>
        </div>
      </div>
    </div>
  );
};
