import React from "react";
import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { UserMenu } from "./UserMenu";

export const TopBar: React.FC = () => {
  const navOptions = [
    { label: "Home", value: "home", path: "/" },
    {
      label: "Speech Analysis",
      value: "speech-analysis",
      path: "/speech-analysis",
    },
    { label: "Quiz", value: "quiz", path: "/quiz" },
  ];

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
            <NavBar
              options={navOptions}
              defaultLabel="Go to"
              className="text-white"
            />
            <Link
              to="/leaderboard"
              className="text-white hover:bg-cyan-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              Leaderboard
            </Link>
            <UserMenu />
          </nav>
        </div>
      </div>
    </div>
  );
};
