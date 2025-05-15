import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

interface UserMenuProps {
  className?: string;
  username?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  className = "",
  username = "User",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfile = () => {
    setIsOpen(false);
    navigate("/profile");
  };

  const handleChangePassword = () => {
    setIsOpen(false);
    navigate("/reset-password");
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center justify-between px-4 py-2 text-sm font-medium text-white bg-transparent rounded-md hover:bg-cyan-600 transition duration-150 ease-in-out focus:outline-none"
      >
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-white text-blue-500 flex items-center justify-center mr-2">
            {username.charAt(0).toUpperCase()}
          </div>
          <span>{username}</span>
          <span className="ml-2 h-4 w-4 text-white">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <button
              onClick={handleProfile}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <div className="flex items-center">
                <span className="mr-2">👤</span>
                Profile
              </div>
            </button>
            <button
              onClick={handleChangePassword}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <div className="flex items-center">
                <span className="mr-2">🔑</span>
                Change Password
              </div>
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 hover:text-red-700"
            >
              <div className="flex items-center">
                <span className="mr-2">🚪</span>
                Logout
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
