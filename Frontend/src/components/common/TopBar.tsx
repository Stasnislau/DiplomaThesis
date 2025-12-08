import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { UserMenu } from "./UserMenu";
import { useAuthStore } from "@/store/useAuthStore";

export const TopBar: React.FC = () => {
  const navOptions = [
    { label: "Home", value: "home", path: "/" },
    { label: "Materials", value: "materials", path: "/materials" },
    {
      label: "Speech Analysis",
      value: "speech-analysis",
      path: "/speech-analysis",
    },
    { label: "Tasks", value: "tasks", path: "/tasks" },
    { label: "Quiz", value: "quiz", path: "/quiz" },
    { label: "Leaderboard", value: "leaderboard", path: "/leaderboard" },
  ];

  const { userRole, isAuthenticated } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsAdmin(userRole === "ADMIN");
    }
  }, [isAuthenticated, userRole]);

  return (
    <div className="bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex-shrink-0">
            <Link to="/" className="text-white font-bold text-xl">
              EasyLanguage
            </Link>
          </div>
          <nav className="flex space-x-4 items-center">
            {isAdmin && isAuthenticated && (
              <Link
                to="/admin"
                className="text-white hover:bg-cyan-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                Admin
              </Link>
            )}
            {isAuthenticated && (
              <NavBar
                options={navOptions}
                defaultLabel="Go to"
                className="text-white"
              />
            )}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <Link
                to="/login"
                className="text-white hover:bg-cyan-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};
